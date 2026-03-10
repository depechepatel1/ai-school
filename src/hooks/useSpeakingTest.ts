import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { TestState, TestPart, TestStatus, ChatMsg, Persona } from "@/types/speaking";
import { INITIAL_TEST_STATE, SYSTEM_PROMPT } from "@/types/speaking";
import { chat, type ChatMessage } from "@/services/ai";
import { speak, stopSpeaking, type TTSHandle } from "@/lib/tts-provider";
import { startListening, type STTHandle } from "@/lib/stt-provider";
import type { Accent } from "@/lib/tts-provider";
import { createDebouncedPunctuate } from "@/lib/punctuate";

interface UseSpeakingTestOptions {
  accent: Accent;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function useSpeakingTest({ accent, onRecordingStart, onRecordingStop }: UseSpeakingTestOptions) {
  const [testState, setTestState] = useState<TestState>(INITIAL_TEST_STATE);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "teacher", text: "Hello. Could you start by telling me your full name, please?" },
  ]);
  const [persona, setPersona] = useState<Persona>("Examiner");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTestConfig, setShowTestConfig] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [completedParts, setCompletedParts] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");

  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const sttHandleRef = useRef<STTHandle | null>(null);
  const currentTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const testStateRef = useRef(testState);
  const nextTransition = useRef<any>(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Debounced punctuation — updates liveTranscript with punctuated text
  const debouncedPunctuate = useMemo(
    () => createDebouncedPunctuate((punctuated) => {
      setLiveTranscript(punctuated);
    }, 800),
    []
  );

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { testStateRef.current = testState; }, [testState]);

  // ── Speech recognition ──
  const startSpeechRecognition = useCallback(() => {
    if (sttHandleRef.current) { sttHandleRef.current.stop(); sttHandleRef.current = null; }
    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => {
        currentTranscriptRef.current += " " + text;
        setLiveTranscript(prev => (prev + " " + text).trimStart());
        setLiveInterim("");
        debouncedPunctuate(currentTranscriptRef.current.trim());
      },
      onInterim: (text) => {
        interimTranscriptRef.current = text;
        setLiveInterim(text);
      },
      onError: (err) => { if (err === "not-allowed") setIsRecording(false); },
    });
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (sttHandleRef.current) { sttHandleRef.current.stop(); sttHandleRef.current = null; }
  }, []);

  // ── TTS ──
  const speakTeacherText = useCallback((text: string) => {
    ttsHandleRef.current?.stop();
    ttsHandleRef.current = speak(text, accent, { rate: 1.0 });
  }, [accent]);

  // ── AI ──
  const triggerAIQuestion = useCallback(async () => {
    setIsAiThinking(true);
    try {
      const currentMessages = messagesRef.current;
      const history: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...currentMessages.map((m) => ({
          role: (m.role === "teacher" ? "assistant" : "user") as "system" | "user" | "assistant",
          content: m.text,
        })),
      ];
      const response = await chat(history, `I am currently in ${testStateRef.current.currentPart}. Ask me a relevant question based on my previous answer if provided.`);
      setIsAiThinking(false);
      setMessages((prev) => [...prev, { role: "teacher", text: response }]);
      speakTeacherText(response);
    } catch {
      setIsAiThinking(false);
      const fallback = "Let's move to the next question.";
      setMessages((prev) => [...prev, { role: "teacher", text: fallback }]);
      speakTeacherText(fallback);
    }
  }, [speakTeacherText]);

  // ── Transition helpers ──
  const startTransition = useCallback((part: TestPart, duration: number, index?: number) => {
    nextTransition.current = { part, duration, index };
    setCountdown(3);
  }, []);

  // ── Timer effect ──
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (testState.status === "running" && testState.timeLeft > 0) {
      interval = setInterval(() => {
        setTestState((prev) => {
          const newTime = prev.timeLeft - 1;
          if (prev.currentPart === "part2_prep" && newTime === 0) return { ...prev, status: "transition_to_speak" as TestStatus, timeLeft: 0 };
          if (prev.currentPart === "part2_speak" && newTime === 0) return { ...prev, status: "finishing" as TestStatus, timeLeft: 5 };
          return { ...prev, timeLeft: newTime, elapsedInCurrent: prev.elapsedInCurrent + 1 };
        });
      }, 1000);
    } else if (testState.status === "transition_to_speak") {
      startTransition("part2_speak", 120);
    } else if (testState.status === "finishing") {
      interval = setInterval(() => {
        setTestState((prev) => {
          if (prev.timeLeft <= 1) {
            const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
            const userSpeech = totalSpeech || "(Audio Response Recorded)";
            setMessages((m) => [...m, { role: "student", text: userSpeech }]);
            setIsRecording(false);
            stopSpeechRecognition();
            return { ...prev, status: "paused_boundary" as TestStatus, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    if (testState.status === "running" && testState.timeLeft === 0 && (testState.currentPart === "part1" || testState.currentPart === "part3")) {
      setTestState((prev) => ({ ...prev, status: "paused_boundary" as TestStatus, timeLeft: 0 }));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [testState.status, testState.timeLeft, testState.currentPart, startTransition, stopSpeechRecognition]);

  // ── Countdown effect ──
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      setCountdown(null);
      if (nextTransition.current) {
        const { part, duration, index } = nextTransition.current;
        setTestState((prev) => ({
          ...prev, status: "running", currentPart: part, timeLeft: duration, elapsedInCurrent: 0,
          currentPartIndex: index !== undefined ? index : prev.currentPartIndex,
        }));
        nextTransition.current = null;
        if (["part1", "part2_speak", "part3"].includes(part)) {
          setTimeout(() => {
            if (testStateRef.current.status === "running") {
              setIsRecording(true);
              startSpeechRecognition();
              if (part === "part1" || part === "part3") setTimeout(() => triggerAIQuestion(), 1500);
            }
          }, 50);
        }
      }
    }
  }, [countdown, startSpeechRecognition, triggerAIQuestion]);

  // ── Public actions ──
  const finishTest = useCallback(() => {
    setIsRecording(false);
    stopSpeechRecognition();
    setTestState((prev) => ({ ...prev, status: "completed" }));
    setShowSaveModal(true);
  }, [stopSpeechRecognition]);

  const advanceTest = useCallback(() => {
    const nextIndex = testState.currentPartIndex + 1;
    if (testState.currentPart === "part2_speak") setCompletedParts((prev) => [...prev, "Part 2"]);
    else if (testState.currentPart === "part1") setCompletedParts((prev) => [...prev, "Part 1"]);
    else if (testState.currentPart === "part3") setCompletedParts((prev) => [...prev, "Part 3"]);

    if (nextIndex < testState.queue.length) {
      const nextPartId = testState.queue[nextIndex];
      if (nextPartId === "part2") {
        setTestState((prev) => ({ ...prev, status: "running", currentPart: "part2_prep", timeLeft: 60, elapsedInCurrent: 0, currentPartIndex: nextIndex }));
      } else {
        startTransition(nextPartId as TestPart, 300, nextIndex);
      }
    } else {
      finishTest();
    }
  }, [testState, startTransition, finishTest]);

  const stopTestManual = useCallback(() => {
    stopSpeaking();
    setCountdown(null);
    nextTransition.current = null;
    if (isRecordingRef.current) {
      const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
      if (totalSpeech.length > 0) setMessages((prev) => [...prev, { role: "student", text: totalSpeech }]);
    }
    setIsRecording(false);
    stopSpeechRecognition();
    setTestState((prev) => ({ ...prev, status: "completed" }));
    setShowSaveModal(true);
    onRecordingStop?.();
  }, [stopSpeechRecognition, onRecordingStop]);

  const runTestSetup = useCallback(async (partsList: string[]) => {
    setCompletedParts([]);
    const introMsg = "Starting test. Good luck. Let's begin.";
    setMessages((prev) => [...prev, { role: "teacher", text: introMsg }]);
    speakTeacherText(introMsg);
    const firstPart = partsList[0];
    let firstPartState: TestPart = firstPart as TestPart;
    let duration = 300;
    if (firstPart === "part2") { firstPartState = "part2_prep"; duration = 60; }
    setTestState({ status: "running", queue: partsList, currentPartIndex: 0, currentPart: firstPartState, timeLeft: duration, elapsedInCurrent: 0 });
    if (firstPartState === "part1" || firstPartState === "part3") {
      setTimeout(() => { setIsRecording(true); startSpeechRecognition(); setTimeout(() => triggerAIQuestion(), 1500); }, 500);
    }
  }, [speakTeacherText, startSpeechRecognition, triggerAIQuestion]);

  const initiateCountdown = useCallback((partsList: string[]) => {
    setShowTestConfig(false);
    setCountdown(3);
    setTimeout(() => runTestSetup(partsList), 3000);
  }, [runTestSetup]);

  const skipPrep = useCallback(() => startTransition("part2_speak", 120), [startTransition]);

  const handleNextQuestion = useCallback(async () => {
    setIsRecording(false);
    stopSpeechRecognition();
    const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    const userSpeech = totalSpeech || "(Audio Response Recorded)";
    setMessages((prev) => [...prev, { role: "student", text: userSpeech }]);
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setLiveTranscript("");
    setLiveInterim("");
    await triggerAIQuestion();
    setIsRecording(true);
    startSpeechRecognition();
  }, [stopSpeechRecognition, startSpeechRecognition, triggerAIQuestion]);

  const clearTranscript = useCallback(() => {
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setLiveTranscript("");
    setLiveInterim("");
  }, []);

  const handlePersonaChange = useCallback((newPersona: Persona) => {
    setPersona(newPersona);
    const greetings: Record<Persona, string> = {
      Examiner: "Good day. Shall we begin a practice test?",
      Teacher: "Hello! Do you have a question about English grammar or vocabulary?",
      Friend: "Hi, we can talk privately about anything you like.",
      Subject: "Hi, we can talk about any of your other subjects.",
      Counselor: "Hello. I'm here to listen. What's on your mind today?",
    };
    setMessages((prev) => [...prev, { role: "teacher", text: greetings[newPersona] }]);
  }, []);

  const resetTest = useCallback(() => {
    setShowSaveModal(false);
    setTestState(INITIAL_TEST_STATE);
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

  const getPersonaBubbleStyle = (p: Persona) => {
    switch (p) {
      case "Teacher": return "bg-green-900/40 border-green-500/30 text-green-100";
      case "Friend": return "bg-yellow-900/40 border-yellow-500/30 text-yellow-100";
      case "Subject": return "bg-purple-900/40 border-purple-500/30 text-purple-100";
      case "Counselor": return "bg-pink-900/40 border-pink-500/30 text-pink-100";
      default: return "bg-cyan-900/40 border-cyan-500/30 text-cyan-100";
    }
  };

  return {
    testState,
    messages,
    persona,
    isAiThinking,
    showSaveModal,
    showTestConfig,
    setShowTestConfig,
    countdown,
    completedParts,
    isRecording,
    setIsRecording,
    liveTranscript,
    liveInterim,
    clearTranscript,
    ttsHandleRef,
    startSpeechRecognition,
    stopSpeechRecognition,
    advanceTest,
    stopTestManual,
    finishTest,
    initiateCountdown,
    skipPrep,
    handleNextQuestion,
    handlePersonaChange,
    resetTest,
    partLabel,
    getPersonaBubbleStyle,
    speakTeacherText,
  };
}
