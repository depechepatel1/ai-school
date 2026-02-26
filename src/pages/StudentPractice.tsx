import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, LogOut, Menu, X } from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/tts";
import { useSpeechRecognition } from "@/lib/stt";

const USE_LIVE2D = false;

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

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // Load conversations
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

  // Load messages for active conversation
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

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

    // Optimistic add
    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: userMessage, created_at: new Date().toISOString() }]);

    try {
      // Save user message
      await supabase.from("messages").insert({ conversation_id: activeConversationId, role: "user", content: userMessage });

      // Call edge function for AI response
      const { data: historyData } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      const { data, error } = await supabase.functions.invoke("deepseek-chat", {
        body: { messages: historyData || [] },
      });

      if (error) throw error;

      const aiContent = data?.content || "Sorry, I couldn't process that. Please try again.";

      // Save AI message
      await supabase.from("messages").insert({ conversation_id: activeConversationId, role: "assistant", content: aiContent });

      // Update conversation title from first exchange
      if (messages.length <= 1) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        await supabase.from("conversations").update({ title }).eq("id", activeConversationId);
        setConversations((prev) => prev.map((c) => c.id === activeConversationId ? { ...c, title } : c));
      }

      // TTS
      if (ttsEnabled) speakText(aiContent);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Background video */}
      {!USE_LIVE2D && (
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-30"
          src="https://cdn.pixabay.com/video/2020/08/12/46965-449623554_large.mp4"
        />
      )}

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 left-4 z-30 md:hidden glass-card p-2"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || typeof window !== "undefined") && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: sidebarOpen ? 0 : -280 }}
            className={`absolute md:relative z-20 w-[280px] h-full flex flex-col bg-sidebar border-r border-sidebar-border md:translate-x-0 ${
              !sidebarOpen ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="text-lg font-bold gradient-text">Speaking Studio</h2>
            </div>

            <div className="p-3">
              <Button onClick={createConversation} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" /> New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveConversationId(c.id); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                    activeConversationId === c.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-2 opacity-60" />
                  {c.title}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-sidebar-border">
              <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col relative z-10">
        {!activeConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
              <h2 className="text-3xl font-bold gradient-text">Ready to Practice?</h2>
              <p className="text-muted-foreground max-w-md">Start a new conversation to practice your English speaking skills with your AI tutor.</p>
              <Button onClick={createConversation} className="orange-glow">
                <Plus className="w-4 h-4 mr-2" /> Start New Chat
              </Button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "glass-card rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="p-4 border-t border-border bg-background/80 backdrop-blur-lg">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { ttsEnabled ? stopSpeaking() : null; setTtsEnabled(!ttsEnabled); }}
                  className={ttsEnabled ? "text-primary" : "text-muted-foreground"}
                >
                  {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                  className={isListening ? "text-destructive pulse-recording" : "text-muted-foreground"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type or hold the mic to speak..."
                  className="flex-1 bg-secondary/50 border-border"
                />

                <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="orange-glow">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
