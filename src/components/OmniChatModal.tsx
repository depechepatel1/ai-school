import { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { X, Send, Mic, Loader2, MicOff, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { speak, stopSpeaking, type Accent } from "@/lib/tts-provider";
import NeuralLogo from "./NeuralLogo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { streamChat } from "@/lib/chat-stream";
import { startListening, type STTHandle } from "@/lib/stt-provider";
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  insertMessage,
} from "@/services/db";

interface OmniChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const OmniChatModal = forwardRef<HTMLDivElement, OmniChatModalProps>(
  ({ isOpen, onClose }, ref) => {
    const { session } = useAuth();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [sttLang, setSttLang] = useState<"en-US" | "zh-CN">("en-US");
    const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const sttRef = useRef<STTHandle | null>(null);

    // Load or create conversation on open
    useEffect(() => {
      if (!isOpen || !session?.user?.id) return;

      const init = async () => {
        const convos = await fetchConversations(session.user.id);
        let convo = convos[0]; // most recent
        if (!convo) {
          convo = await createConversation(session.user.id, "Teacher Li Chat");
        }
        setConversationId(convo.id);

        const msgs = await fetchMessages(convo.id);
        setMessages(
          msgs.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
      };

      init().catch(console.error);
    }, [isOpen, session?.user?.id]);

    // Stop listening & TTS when modal closes
    useEffect(() => {
      if (!isOpen) {
        if (sttRef.current) {
          sttRef.current.stop();
          sttRef.current = null;
          setIsListening(false);
        }
        stopSpeaking();
        setSpeakingMsgIdx(null);
      }
    }, [isOpen]);

    // Auto-scroll
    useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const toggleVoice = useCallback(() => {
      if (isListening) {
        sttRef.current?.stop();
        sttRef.current = null;
        setIsListening(false);
        return;
      }

      setIsListening(true);
      sttRef.current = startListening(sttLang, {
        onResult: (text) => {
          setInput((prev) => (prev + " " + text).trim());
        },
        onInterim: () => {},
        onError: (err) => {
          console.warn("[STT] error:", err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
          sttRef.current = null;
        },
      }, true);
    }, [isListening, sttLang]);

    const send = useCallback(async () => {
      // Stop voice if active
      if (sttRef.current) {
        sttRef.current.stop();
        sttRef.current = null;
        setIsListening(false);
      }

      const text = input.trim();
      if (!text || isLoading || !conversationId || !session) return;

      setInput("");
      const userMsg: ChatMsg = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);

      // Persist user message
      await insertMessage(conversationId, "user", text).catch(console.error);

      setIsLoading(true);
      let assistantSoFar = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 0 && prev[prev.length - 2]?.content === text) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token =
          (await supabase.auth.getSession()).data.session?.access_token ?? "";

        await streamChat({
          messages: [...messages, userMsg],
          token,
          onDelta: upsert,
          onDone: async () => {
            setIsLoading(false);
            // Persist assistant message
            if (assistantSoFar) {
              await insertMessage(conversationId, "assistant", assistantSoFar).catch(
                console.error,
              );
              // Auto-speak if user wrote in Chinese
              const hasChinese = /[\u4e00-\u9fa5]/.test(text);
              if (hasChinese) {
                speak(assistantSoFar, "zh");
              }
            }
          },
          signal: controller.signal,
        });
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Chat error:", e);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Sorry, something went wrong: ${e.message}` },
          ]);
        }
        setIsLoading(false);
      }
    }, [input, isLoading, conversationId, session, messages]);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="absolute bottom-24 right-6 z-50 w-[320px] h-[420px] bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] animate-fade-in-up border-glow-subtle flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
          <span className="text-white font-bold flex items-center gap-2 text-outline text-sm">
            <NeuralLogo />
            <span className="tracking-wide">Teacher Li</span>
          </span>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-white/70 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="bg-white/5 rounded-2xl p-3 text-xs leading-relaxed text-gray-200 border border-white/5">
              Hi, I'm Teacher Li — your AI English tutor. What would you like to talk about?
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600/80 text-white rounded-br-sm"
                    : "bg-white/[0.08] text-gray-200 border border-white/5 rounded-bl-sm"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-xs max-w-none [&_p]:m-0 [&_p]:leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    <button
                      type="button"
                      onClick={() => {
                        if (speakingMsgIdx === i) {
                          stopSpeaking();
                          setSpeakingMsgIdx(null);
                        } else {
                          stopSpeaking();
                          const hasChinese = /[\u4e00-\u9fa5]/.test(m.content);
                          const accent: Accent = hasChinese ? "zh" : "uk";
                          const handle = speak(m.content, accent, {
                            onEnd: () => setSpeakingMsgIdx(null),
                          });
                          setSpeakingMsgIdx(i);
                        }
                      }}
                      className={`mt-1 p-0.5 rounded hover:bg-white/10 transition-colors ${speakingMsgIdx === i ? "text-blue-400" : "text-white/30 hover:text-white/60"}`}
                      title="Read aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-white/[0.08] rounded-2xl px-3 py-2 border border-white/5 rounded-bl-sm">
                <Loader2 className="w-3.5 h-3.5 text-white/50 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-1">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="relative flex items-center bg-black/50 border border-white/10 rounded-full p-1 pl-3 shadow-sm transition-colors focus-within:border-blue-400/50 focus-within:bg-black/70"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type or speak..."}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0 mr-2 disabled:opacity-50"
              />
              {/* Language toggle */}
              <button
                type="button"
                onClick={() => setSttLang(prev => prev === "en-US" ? "zh-CN" : "en-US")}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-[9px] font-bold tracking-wide hover:bg-white/[0.1] transition-all select-none shrink-0"
                title={sttLang === "en-US" ? "切换到中文" : "Switch to English"}
              >
                <span className={sttLang === "en-US" ? "text-blue-300" : "text-gray-500"}>EN</span>
                <span className="text-gray-600">/</span>
                <span className={sttLang === "zh-CN" ? "text-blue-300" : "text-gray-500"}>中</span>
              </button>
              {/* Voice toggle button — shown when input is empty and not loading */}
              {!input.trim() && !isLoading && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {/* Send button — shown when there's text or loading */}
              {(input.trim() || isLoading) && (
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-full transition-all duration-300 shadow-lg bg-blue-600 text-white disabled:opacity-40"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  },
);

OmniChatModal.displayName = "OmniChatModal";

export default OmniChatModal;
