import { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { X, Send, Mic, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import NeuralLogo from "./NeuralLogo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { streamChat } from "@/lib/chat-stream";
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

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

    // Auto-scroll
    useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const send = useCallback(async () => {
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
              Hi, I'm Teacher Li — your AI English tutor. What would you like to practice?
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
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0 mr-2 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                  input.trim()
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-white/80"
                } disabled:opacity-40`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : input.trim() ? (
                  <Send className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  },
);

OmniChatModal.displayName = "OmniChatModal";

export default OmniChatModal;
