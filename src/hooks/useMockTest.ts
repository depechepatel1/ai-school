import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { TestPart, TestStatus, ChatMsg } from "@/types/speaking";
import { SYSTEM_PROMPT } from "@/types/speaking";
import { chat, type ChatMessage } from "@/services/ai";
import { speak, stopSpeaking, type TTSHandle } from "@/lib/tts-provider";
import { startListening, type STTHandle } from "@/lib/stt-provider";
import type { Accent } from "@/lib/tts-provider";
import { createDebouncedPunctuate } from "@/lib/punctuate";
import { createPauseTracker, stripPauseMarkers, reinsertPauseMarkers } from "@/lib/speech-annotations";
import { supabase } from "@/integrations/supabase/client";
import { fetchPart1Script, buildPart1Sequence, stripBracketPrompts, type Part1Sequence } from "@/services/mock-part1-curriculum";

// ── Types ──────────────────────────────────────────────────────

export type MockTestPhase = "config" | "countdown" | "active" | "scoring" | "report";

export interface CriterionScore {
  name: string;
  score: string;
  assessment: string;
  tip: string;
}

export interface MockTestResult {
  overallBand: string;
  criteria: CriterionScore[];
  vocabularySuggestions: string[];
  transcript: string;
}

export interface UseMockTestOptions {
  accent: Accent;
  userId: string | null;
}

export function useMockTest({ accent, userId }: UseMockTestOptions) {
  // ── Phase management ──
  const [phase, setPhase] = useState<MockTestPhase>("config");
  const [countdown, setCountdown] = useState<number | null>(null);

  // ── Config ──
  const [selectedParts, setSelectedParts] = useState({ part1: true, part2: true, part3: true });
  const [selectedWeek, setSelectedWeek] = useState(1);

  // ── Active test state ──
  const [currentPart, setCurrentPart] = useState<TestPart | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<TestStatus>("idle");
  const [completedParts, setCompletedParts] = useState<string[]>([]);

  // ── Chat / AI ──
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");

  // ── Results ──
  const [result, setResult] = useState<MockTestResult | null>(null);
  const [scoringStep, setScoringStep] = useState(0);

  // ── Examiner karaoke state ──
  const [examinerText, setExaminerText] = useState("");
  const [examinerCharIndex, setExaminerCharIndex] = useState(-1);

  // ── Part 1 script ──
  const part1SequenceRef = useRef<Part1Sequence | null>(null);
  const part1StepRef = useRef<{ segIdx: number; qIdx: number }>({ segIdx: 0, qIdx: 0 });
  const part1IntroIndexRef = useRef(0);
  const part1IntroPhaseRef = useRef(true); // true = still doing introduction lines

  // ── Refs ──
  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const sttHandleRef = useRef<STTHandle | null>(null);
  const currentTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const statusRef = useRef(status);
  const currentPartRef = useRef(currentPart);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pauseTracker = useRef(createPauseTracker(1500));
  const pauseSlotsRef = useRef<ReturnType<typeof stripPauseMarkers>["slots"]>([]);

  const trackTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    pendingTimeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => { pendingTimeoutsRef.current.forEach(clearTimeout); }, []);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { currentPartRef.current = currentPart; }, [currentPart]);

  // Pre-fetch Part 1 script eagerly during config phase
  useEffect(() => {
    if (phase !== "config") return;
    fetchPart1Script()
      .then((script) => {
        const sequence = buildPart1Sequence(script, {
          examiner_name: "Miss Li",
          country: "your country",
        });
        part1SequenceRef.current = sequence;
        part1IntroIndexRef.current = 0;
        part1IntroPhaseRef.current = true;
        part1StepRef.current = { segIdx: 0, qIdx: 0 };
      })
      .catch((err) => {
        console.warn("Failed to pre-fetch Part 1 script:", err);
        part1SequenceRef.current = null;
      });
  }, [phase]);

  // ── Punctuation ──
  const debouncedPunctuate = useMemo(
    () => createDebouncedPunctuate((punctuated) => {
      const restored = reinsertPauseMarkers(punctuated, pauseSlotsRef.current);
      currentTranscriptRef.current = restored;
      setLiveTranscript(restored);
    }, 800),
    []
  );

  const punctuateWithMarkers = useCallback((raw: string) => {
    const { clean, slots } = stripPauseMarkers(raw);
    pauseSlotsRef.current = slots;
    debouncedPunctuate(clean);
  }, [debouncedPunctuate]);

  // ── STT ──
  const startSTT = useCallback(() => {
    sttHandleRef.current?.stop();
    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => {
        const marker = pauseTracker.current.onChunk();
        currentTranscriptRef.current += marker + " " + text;
        setLiveTranscript(currentTranscriptRef.current.trimStart());
        setLiveInterim("");
        punctuateWithMarkers(currentTranscriptRef.current.trim());
      },
      onInterim: (text) => {
        interimTranscriptRef.current = text;
        setLiveInterim(text);
      },
      onError: (err) => { if (err === "not-allowed") setIsRecording(false); },
    });
  }, [punctuateWithMarkers]);

  const stopSTT = useCallback(() => {
    sttHandleRef.current?.stop();
    sttHandleRef.current = null;
  }, []);

  // ── Auto-chain generation counter (to cancel stale chains) ──
  const chainGenRef = useRef(0);

  // ── TTS ──
  const speakText = useCallback((text: string) => {
    ttsHandleRef.current?.stop();
    setExaminerText(text);
    setExaminerCharIndex(-1);
    ttsHandleRef.current = speak(text, accent, {
      rate: 1.0,
      onBoundary: (charIdx) => setExaminerCharIndex(charIdx),
      onEnd: () => setExaminerCharIndex(text.length),
    });
  }, [accent]);

  // ── AI (for Parts 2/3) ──
  const triggerAIQuestion = useCallback(async () => {
    setIsAiThinking(true);
    try {
      const history: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: (m.role === "teacher" ? "assistant" : "user") as "system" | "user" | "assistant",
          content: m.text,
        })),
      ];
      const response = await chat(history, `I am currently in ${currentPartRef.current}. Ask me a relevant question.`);
      setIsAiThinking(false);
      setMessages((prev) => [...prev, { role: "teacher", text: response }]);
      speakText(response);
    } catch {
      setIsAiThinking(false);
      const fallback = "Let's move to the next question.";
      setMessages((prev) => [...prev, { role: "teacher", text: fallback }]);
      speakText(fallback);
    }
  }, [messages, speakText]);

  // ── Part 1 scripted question flow ──
  const speakNextPart1Question = useCallback(() => {
    const seq = part1SequenceRef.current;
    if (!seq) return false;

    // Capture current generation so we can bail if test state changes
    const gen = chainGenRef.current;

    // Helper: speak a line, then auto-chain if it's not a question
    const speakLineAndMaybeChain = (line: string): boolean => {
      setMessages((prev) => [...prev, { role: "teacher", text: line }]);
      speakText(line);

      const isQuestion = line.includes("?");
      if (!isQuestion) {
        // Auto-chain: wait for TTS to finish, then speak next line
        ttsHandleRef.current?.finished.then(() => {
          // Guard: bail if test was stopped/changed
          if (chainGenRef.current !== gen) return;
          if (currentPartRef.current !== "part1") return;
          if (statusRef.current !== "running") return;
          trackTimeout(setTimeout(() => {
            if (chainGenRef.current !== gen) return;
            speakNextPart1Question();
          }, 800));
        });
      }
      return true;
    };

    // Still in introduction phase? Speak intro lines first
    if (part1IntroPhaseRef.current) {
      const idx = part1IntroIndexRef.current;
      if (idx < seq.introduction.length) {
        const line = seq.introduction[idx];
        part1IntroIndexRef.current = idx + 1;
        return speakLineAndMaybeChain(line);
      }
      // Done with introduction — move to segments
      part1IntroPhaseRef.current = false;
    }

    const { segIdx, qIdx } = part1StepRef.current;
    if (segIdx >= seq.segments.length) return false; // all done

    const segment = seq.segments[segIdx];

    // Speak segment intro before first question
    if (qIdx === 0 && segment.intro) {
      // After intro, start at Q0
      part1StepRef.current = { segIdx, qIdx: -1 }; // sentinel: intro spoken
      return speakLineAndMaybeChain(segment.intro);
    }

    const effectiveQIdx = qIdx === -1 ? 0 : qIdx; // after intro, start at Q0
    if (effectiveQIdx >= segment.questions.length) {
      // Move to next segment
      part1StepRef.current = { segIdx: segIdx + 1, qIdx: 0 };
      return speakNextPart1Question(); // recurse into next segment
    }

    const question = segment.questions[effectiveQIdx];
    part1StepRef.current = { segIdx, qIdx: effectiveQIdx + 1 };
    return speakLineAndMaybeChain(question);
  }, [speakText, trackTimeout]);

  // ── Timer ──
  useEffect(() => {
    if (status !== "running" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (currentPartRef.current === "part2_prep" && next === 0) {
          setStatus("transition_to_speak");
          return 0;
        }
        if (next === 0 && (currentPartRef.current === "part1" || currentPartRef.current === "part3" || currentPartRef.current === "part2_speak")) {
          const speech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
          if (speech) setMessages((m) => [...m, { role: "student", text: speech }]);
          setIsRecording(false);
          stopSTT();
          setStatus("paused_boundary");
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, timeLeft, stopSTT]);

  // Auto-transition from part2_prep to part2_speak
  useEffect(() => {
    if (status === "transition_to_speak") {
      beginPart("part2_speak", 120);
    }
  }, [status]);

  // ── Part management ──
  const beginPart = useCallback((part: TestPart, duration: number) => {
    setCurrentPart(part);
    setTimeLeft(duration);
    setStatus("running");
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    pauseTracker.current.reset();
    setLiveTranscript("");
    setLiveInterim("");

    if (["part1", "part2_speak", "part3"].includes(part)) {
      // Start STT and TTS in parallel with minimal delay
      setIsRecording(true);
      startSTT();
      if (part === "part1") {
        trackTimeout(setTimeout(() => speakNextPart1Question(), 500));
      } else if (part === "part3") {
        trackTimeout(setTimeout(() => triggerAIQuestion(), 500));
      }
    }
  }, [startSTT, triggerAIQuestion, speakNextPart1Question, trackTimeout]);

  const advancePart = useCallback(() => {
    if (currentPart === "part1") setCompletedParts((p) => [...p, "Part 1"]);
    else if (currentPart === "part2_speak") setCompletedParts((p) => [...p, "Part 2"]);
    else if (currentPart === "part3") setCompletedParts((p) => [...p, "Part 3"]);

    const nextIdx = currentPartIndex + 1;
    if (nextIdx < queue.length) {
      setCurrentPartIndex(nextIdx);
      const nextPart = queue[nextIdx];
      if (nextPart === "part2") {
        beginPart("part2_prep", 60);
      } else {
        beginPart(nextPart as TestPart, 300);
      }
    } else {
      setIsRecording(false);
      stopSTT();
      setStatus("completed");
      setPhase("scoring");
    }
  }, [currentPart, currentPartIndex, queue, beginPart, stopSTT]);

  // ── Scoring ──
  useEffect(() => {
    if (phase !== "scoring") return;
    const steps = ["Analyzing fluency...", "Evaluating vocabulary...", "Scoring grammar...", "Generating report..."];
    let step = 0;
    setScoringStep(0);
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) setScoringStep(step);
      else clearInterval(interval);
    }, 1200);

    const transcript = messages
      .map((m) => `${m.role === "student" ? "Student" : "Examiner"}: ${m.text}`)
      .join("\n");

    const scoringMessages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an IELTS Speaking Examiner providing a post-session assessment. Return a JSON object (no markdown fences) with this exact structure:
{
  "overallBand": "6.0",
  "criteria": [
    {"name": "Fluency & Coherence", "score": "6.0", "assessment": "...", "tip": "..."},
    {"name": "Lexical Resource", "score": "5.5", "assessment": "...", "tip": "..."},
    {"name": "Grammatical Range & Accuracy", "score": "6.0", "assessment": "...", "tip": "..."},
    {"name": "Pronunciation", "score": "6.0", "assessment": "...", "tip": "..."}
  ],
  "vocabularySuggestions": ["word1", "word2", "word3"]
}
Keep assessments to 1-2 sentences. Be encouraging but honest.`,
      },
      {
        role: "user",
        content: `Here is the transcript (${completedParts.length} parts completed):\n\n${transcript}`,
      },
    ];

    import("@/services/ai").then(({ sendChatMessage }) => {
      sendChatMessage(scoringMessages)
        .then((res) => {
          try {
            const parsed = JSON.parse(res.content);
            setResult({
              overallBand: parsed.overallBand || "N/A",
              criteria: parsed.criteria || [],
              vocabularySuggestions: parsed.vocabularySuggestions || [],
              transcript,
            });
          } catch {
            setResult({ overallBand: "N/A", criteria: [], vocabularySuggestions: [], transcript });
          }
          setPhase("report");
        })
        .catch(() => {
          setResult({ overallBand: "N/A", criteria: [], vocabularySuggestions: [], transcript });
          setPhase("report");
        });
    });

    return () => clearInterval(interval);
  }, [phase, messages, completedParts]);

  // ── Save session ──
  const saveSession = useCallback(async () => {
    if (!userId || !result) return;
    await supabase.from("mock_test_sessions" as any).insert({
      user_id: userId,
      week_number: selectedWeek,
      parts_completed: completedParts,
      transcript: result.transcript,
      overall_band: result.overallBand,
      criteria_scores: result.criteria as any,
      vocabulary_suggestions: result.vocabularySuggestions,
      accent,
      duration_seconds: 0,
    });
  }, [userId, result, selectedWeek, completedParts, accent]);

  // ── Public actions ──
  const startTest = useCallback(async () => {
    const parts: string[] = [];
    if (selectedParts.part1) parts.push("part1");
    if (selectedParts.part2) parts.push("part2");
    if (selectedParts.part3) parts.push("part3");
    if (parts.length === 0) return;

    // Reset Part 1 script pointers (script already pre-fetched)
    if (selectedParts.part1 && part1SequenceRef.current) {
      part1IntroIndexRef.current = 0;
      part1IntroPhaseRef.current = true;
      part1StepRef.current = { segIdx: 0, qIdx: 0 };
    }

    setQueue(parts);
    setCurrentPartIndex(0);
    setCompletedParts([]);
    setMessages([]);
    chainGenRef.current++;

    setPhase("countdown");
    setCountdown(3);
  }, [selectedParts]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
      return () => clearTimeout(t);
    }
    if (countdown === 0) {
      setCountdown(null);
      setPhase("active");
      const firstPart = queue[0];
      if (firstPart === "part2") {
        beginPart("part2_prep", 60);
      } else {
        beginPart(firstPart as TestPart, 300);
      }
    }
  }, [countdown, queue, beginPart]);

  const skipPrep = useCallback(() => {
    beginPart("part2_speak", 120);
  }, [beginPart]);

  const handleNextQuestion = useCallback(async () => {
    setIsRecording(false);
    stopSTT();
    const speech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    if (speech) setMessages((prev) => [...prev, { role: "student", text: speech }]);
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    pauseTracker.current.reset();
    setLiveTranscript("");
    setLiveInterim("");

    // Use scripted questions for Part 1, AI for Part 3
    if (currentPartRef.current === "part1" && part1SequenceRef.current) {
      const hasMore = speakNextPart1Question();
      if (!hasMore) {
        // All Part 1 questions exhausted — auto-advance
        setStatus("paused_boundary");
        return;
      }
    } else {
      await triggerAIQuestion();
    }

    setIsRecording(true);
    startSTT();
  }, [stopSTT, startSTT, triggerAIQuestion, speakNextPart1Question]);

  const stopTestEarly = useCallback(() => {
    chainGenRef.current++;
    stopSpeaking();
    const speech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    if (speech) setMessages((prev) => [...prev, { role: "student", text: speech }]);
    setIsRecording(false);
    stopSTT();
    setStatus("completed");
    setPhase("scoring");
  }, [stopSTT]);

  const resetTest = useCallback(() => {
    chainGenRef.current++;
    setPhase("config");
    setStatus("idle");
    setCurrentPart(null);
    setQueue([]);
    setCurrentPartIndex(-1);
    setTimeLeft(0);
    setCompletedParts([]);
    setMessages([]);
    setResult(null);
    setIsRecording(false);
    setLiveTranscript("");
    setLiveInterim("");
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    part1SequenceRef.current = null;
  }, []);

  const partLabel = (part: TestPart | null) => {
    switch (part) {
      case "part1": return "Part 1: Introduction";
      case "part2_prep": return "Part 2: Preparation";
      case "part2_speak": return "Part 2: Long Turn";
      case "part3": return "Part 3: Discussion";
      default: return "";
    }
  };

  const estimatedMinutes = useMemo(() => {
    let mins = 0;
    if (selectedParts.part1) mins += 5;
    if (selectedParts.part2) mins += 4;
    if (selectedParts.part3) mins += 5;
    return mins;
  }, [selectedParts]);

  return {
    phase, countdown,
    selectedParts, setSelectedParts, selectedWeek, setSelectedWeek, estimatedMinutes,
    currentPart, timeLeft, status, completedParts, queue, currentPartIndex,
    messages, isAiThinking, isRecording, liveTranscript, liveInterim,
    result, scoringStep,
    examinerText, examinerCharIndex,
    startTest, advancePart, skipPrep, handleNextQuestion, stopTestEarly, resetTest, saveSession,
    partLabel,
  };
}
