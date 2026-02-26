import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, LogOut, Menu, X } from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/tts";
import { useSpeechRecognition } from "@/lib/stt";
import PageShell from "@/components/PageShell";

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
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (data) setConversations(data);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    load();

    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const createConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("conversations").insert({ user_id: user.id, title: "New Conversation" }).select().single();
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setConversations((prev) => [data, ...prev]);
    setActiveConversationId(data.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversationId || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: userMessage, created_at: new Date().toISOString() }]);

    try {
      await supabase.from("messages").insert({ conversation_id: activeConversationId, role: "user", content: userMessage });
      const { data: historyData } = await supabase.from("messages").select("role, content").eq("conversation_id", activeConversationId).order("created_at", { ascending: true });
      const { data, error } = await supabase.functions.invoke("deepseek-chat", { body: { messages: historyData || [] } });
      if (error) throw error;
      const aiContent = data?.content || "Sorry, I couldn't process that. Please try again.";
      await supabase.from("messages").insert({ conversation_id: activeConversationId, role: "assistant", content: aiContent });
      if (messages.length <= 1) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        await supabase.from("conversations").update({ title }).eq("id", activeConversationId);
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
      <div className="flex h-[540px] -mx-2">
        {/* Mini sidebar */}
        <div className="w-[140px] shrink-0 border-r border-white/5 flex flex-col">
          <div className="p-2">
            <button onClick={createConversation} className="w-full flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/30 transition-colors">
              <Plus className="w-3 h-3" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide p-1 space-y-0.5">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] truncate transition-colors ${
                  activeConversationId === c.id ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/5">
            <button onClick={signOut} className="w-full flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConversationId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Ready to Practice?</h2>
                <p className="text-[11px] text-gray-500 max-w-[200px] mx-auto">Start a new conversation to practice English speaking.</p>
                <button onClick={createConversation} className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-semibold hover:bg-blue-500/30 transition-colors">
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Start Chat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                      msg.role === "user" ? "bg-blue-600/30 text-blue-100 rounded-br-sm" : "bg-white/5 text-gray-300 rounded-bl-sm"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-xs max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-xl rounded-bl-sm px-3 py-2 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { if (ttsEnabled) stopSpeaking(); setTtsEnabled(!ttsEnabled); }}
                    className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? "text-blue-400" : "text-gray-600"}`}
                  >
                    {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    className={`p-1.5 rounded-lg transition-colors ${isListening ? "text-red-400 pulse-recording" : "text-gray-600"}`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type or hold mic..."
                    className="flex-1 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="p-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
