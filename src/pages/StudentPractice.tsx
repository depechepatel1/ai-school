import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, LogOut } from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/tts";
import { useSpeechRecognition } from "@/lib/stt";
import PageShell from "@/components/PageShell";
import {
  fetchConversations,
  createConversation as dbCreateConversation,
  updateConversationTitle,
  fetchMessages,
  fetchMessageHistory,
  insertMessage,
  subscribeToMessages,
} from "@/services/db";
import { sendChatMessage } from "@/services/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export default function StudentPractice() {
  const { user, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening, transcript } = useSpeechRecognition();

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id).then(setConversations).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    fetchMessages(activeConversationId).then((data) => setMessages(data as Message[])).catch(() => {});

    const unsubscribe = subscribeToMessages(activeConversationId, (payload) => {
      const newMsg = payload.new as Message;
      setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    });

    return unsubscribe;
  }, [activeConversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const createConversation = async () => {
    if (!user) return;
    try {
      const data = await dbCreateConversation(user.id);
      setConversations((prev) => [data, ...prev]);
      setActiveConversationId(data.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversationId || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: userMessage, created_at: new Date().toISOString() }]);

    try {
      await insertMessage(activeConversationId, "user", userMessage);
      const historyData = await fetchMessageHistory(activeConversationId);
      const response = await sendChatMessage(historyData as any);
      const aiContent = response.content;
      await insertMessage(activeConversationId, "assistant", aiContent);
      if (messages.length <= 1) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        await updateConversationTitle(activeConversationId, title);
        setConversations((prev) => prev.map((c) => c.id === activeConversationId ? { ...c, title } : c));
      }
      if (ttsEnabled) speakText(aiContent);
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <PageShell playIntroVideo>
      <div className="flex flex-1 -mx-2">
        {/* Mini sidebar */}
        <div className="w-[130px] shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="p-2.5">
            <button
              onClick={createConversation}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/25 transition-all"
            >
              <Plus className="w-3 h-3" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide px-1.5 space-y-0.5">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[10px] truncate transition-all ${
                  activeConversationId === c.id
                    ? "bg-white/[0.08] text-white border border-white/10"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/[0.06]">
            <button onClick={signOut} className="w-full flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConversationId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/[0.08] border border-blue-400/10 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6 text-blue-400/60" />
                </div>
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Ready to Practice?</h2>
                <p className="text-[11px] text-gray-500 max-w-[200px] mx-auto leading-relaxed">Start a conversation to practice English speaking with AI.</p>
                <button
                  onClick={createConversation}
                  className="px-5 py-2.5 rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold hover:bg-blue-500/25 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Start Chat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-hide">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600/25 text-blue-100 rounded-br-md border border-blue-500/15"
                        : "bg-white/[0.04] text-gray-300 rounded-bl-md border border-white/[0.06]"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-xs max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-2.5 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-1">
                  <button
                    onClick={() => { if (ttsEnabled) stopSpeaking(); setTtsEnabled(!ttsEnabled); }}
                    className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? "text-blue-400 hover:bg-blue-500/10" : "text-gray-600 hover:bg-white/[0.04]"}`}
                  >
                    {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    className={`p-1.5 rounded-lg transition-colors ${isListening ? "text-red-400 pulse-recording bg-red-500/10" : "text-gray-600 hover:bg-white/[0.04]"}`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type or hold mic..."
                    className="flex-1 h-8 px-2 bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="p-1.5 rounded-lg bg-blue-600/25 text-blue-300 hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
