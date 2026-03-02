import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, ChevronRight, Bot, User, Search, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface StudentTranscriptPanelProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function StudentTranscriptPanel({ studentId, studentName, onBack }: StudentTranscriptPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingConvos(true);
      const { data } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", studentId)
        .order("updated_at", { ascending: false });
      setConversations(data ?? []);
      setLoadingConvos(false);
    };
    load();
  }, [studentId]);

  useEffect(() => {
    if (!selectedConvo) return;
    const load = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", selectedConvo.id)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setLoadingMessages(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
    };
    load();
  }, [selectedConvo]);

  if (selectedConvo) {
    return (
      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }} className="flex-1 flex flex-col">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedConvo(null)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-200 truncate">{selectedConvo.title || "Untitled"}</h2>
            <p className="text-[10px] text-gray-500">{studentName} · {new Date(selectedConvo.created_at).toLocaleDateString()}</p>
          </div>
          <span className="text-[10px] text-gray-600 tabular-nums">{messages.length} messages</span>
        </motion.div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-1">
          {loadingMessages && <p className="text-center text-xs text-gray-600 py-8">Loading…</p>}
          {!loadingMessages && messages.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-8">No messages in this conversation</p>
          )}
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <motion.div key={m.id} variants={fadeUp} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? "bg-blue-500/15 border border-blue-400/20 text-blue-100 rounded-br-md"
                    : "bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-bl-md"
                }`}>
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:text-[10px] [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <p className="text-[8px] text-gray-600 mt-1.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const q = searchQuery.toLowerCase().trim();
  const filteredConversations = q
    ? conversations.filter((c) => (c.title || "Untitled").toLowerCase().includes(q))
    : conversations;

  // Conversation list view
  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }} className="flex-1 flex flex-col">
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-200 truncate">{studentName}'s Conversations</h2>
          <p className="text-[10px] text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* Search bar */}
      {conversations.length > 0 && (
        <motion.div variants={fadeUp} className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5">
        {loadingConvos && <p className="text-center text-xs text-gray-600 py-8">Loading…</p>}
        {!loadingConvos && conversations.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-5 h-5 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No conversations yet</p>
          </div>
        )}
        {!loadingConvos && conversations.length > 0 && filteredConversations.length === 0 && (
          <div className="text-center py-8">
            <Search className="w-5 h-5 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No conversations match "{searchQuery}"</p>
          </div>
        )}
        {filteredConversations.map((c) => (
          <motion.div
            key={c.id}
            variants={fadeUp}
            onClick={() => setSelectedConvo(c)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-400/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{c.title || "Untitled"}</p>
              <p className="text-[10px] text-gray-500">{new Date(c.updated_at).toLocaleDateString()}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
