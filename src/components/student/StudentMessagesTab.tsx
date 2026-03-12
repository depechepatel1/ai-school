import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  MessageSquare, StickyNote, ArrowLeft, ChevronRight, Bot, User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface TeacherNote {
  id: string;
  content: string;
  updated_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function StudentMessagesTab() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notedIds, setNotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [note, setNote] = useState<TeacherNote | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations + which have notes
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [convosRes, notesRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, title, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("conversation_notes")
          .select("conversation_id"),
      ]);
      setConversations(convosRes.data ?? []);
      setNotedIds(new Set((notesRes.data ?? []).map((n) => n.conversation_id)));
      setLoading(false);
    };
    load();
  }, [user]);

  // Load messages + note for selected convo
  useEffect(() => {
    if (!selectedConvo) { setMessages([]); setNote(null); return; }
    const load = async () => {
      setLoadingDetail(true);
      const [msgsRes, noteRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", selectedConvo.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("conversation_notes")
          .select("id, content, updated_at")
          .eq("conversation_id", selectedConvo.id)
          .maybeSingle(),
      ]);
      setMessages(msgsRes.data ?? []);
      setNote(noteRes.data);
      setLoadingDetail(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    };
    load();
  }, [selectedConvo]);

  // ── Detail view ──
  if (selectedConvo) {
    return (
      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }} className="flex flex-col h-full">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2">
          <button onClick={() => setSelectedConvo(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white truncate">{selectedConvo.title || "Untitled"}</p>
            <p className="text-[10px] text-white/35">{messages.length} messages</p>
          </div>
        </motion.div>

        {/* Teacher Note Banner */}
        {note && (
          <motion.div variants={fadeUp} className="mb-2 rounded-xl bg-amber-500/[0.06] border border-amber-400/15 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <StickyNote className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">Teacher Feedback</span>
            </div>
            <p className="text-[10px] text-amber-100/80 leading-relaxed whitespace-pre-wrap">{note.content}</p>
          </motion.div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-0.5">
          {loadingDetail && <p className="text-center text-[10px] text-white/30 py-6">Loading…</p>}
          {!loadingDetail && messages.length === 0 && (
            <p className="text-center text-[10px] text-white/30 py-6">No messages</p>
          )}
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <motion.div key={m.id} variants={fadeUp} className={`flex gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-5 h-5 rounded-full bg-teal-500/15 border border-teal-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-teal-400" />
                  </div>
                )}
                <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${
                  isUser
                    ? "bg-teal-500/15 border border-teal-400/20 text-teal-100 rounded-br-sm"
                    : "bg-white/[0.04] border border-white/[0.08] text-white/70 rounded-bl-sm"
                }`}>
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_code]:text-[9px] [&_code]:bg-white/10 [&_code]:px-0.5 [&_code]:rounded">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {isUser && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-1.5">
      {loading && <p className="text-center text-[10px] text-white/30 py-6">Loading…</p>}
      {!loading && conversations.length === 0 && (
        <div className="text-center py-6">
          <MessageSquare className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
          <p className="text-[10px] text-white/30">No conversations yet</p>
        </div>
      )}
      {conversations.map((c, i) => (
        <div
          key={c.id}
          onClick={() => setSelectedConvo(c)}
          className="relative bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all group animate-fade-in-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/[0.08] border border-teal-400/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3 h-3 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{c.title || "Untitled"}</p>
              <p className="text-[9px] text-white/30">{new Date(c.updated_at).toLocaleDateString()}</p>
            </div>
            {notedIds.has(c.id) && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/15">
                <StickyNote className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[8px] font-bold text-amber-300">Feedback</span>
              </div>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}
