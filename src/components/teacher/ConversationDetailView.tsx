/**
 * Conversation detail view — messages + teacher note.
 * Extracted from StudentTranscriptPanel.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, User, StickyNote, Send, Trash2, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface TeacherNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ConversationDetailViewProps {
  conversationId: string;
  conversationTitle: string | null;
  studentName: string;
  createdAt: string;
  onBack: () => void;
  onNoteChanged: (convoId: string, hasNote: boolean) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const MAX_NOTE_LENGTH = 2000;

export default function ConversationDetailView({
  conversationId,
  conversationTitle,
  studentName,
  createdAt,
  onBack,
  onNoteChanged,
}: ConversationDetailViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [note, setNote] = useState<TeacherNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setLoadingMessages(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
    };
    load();
  }, [conversationId]);

  useEffect(() => {
    const loadNote = async () => {
      setLoadingNote(true);
      const { data } = await supabase
        .from("conversation_notes")
        .select("id, content, created_at, updated_at")
        .eq("conversation_id", conversationId)
        .maybeSingle();
      setNote(data);
      setNoteText(data?.content ?? "");
      setEditingNote(false);
      setLoadingNote(false);
    };
    loadNote();
  }, [conversationId]);

  const saveNote = async () => {
    if (!noteText.trim()) return;
    const trimmed = noteText.trim().slice(0, MAX_NOTE_LENGTH);
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (note) {
        const { error } = await supabase
          .from("conversation_notes")
          .update({ content: trimmed })
          .eq("id", note.id);
        if (error) throw error;
        setNote({ ...note, content: trimmed, updated_at: new Date().toISOString() });
      } else {
        const { data, error } = await supabase
          .from("conversation_notes")
          .insert({ conversation_id: conversationId, teacher_id: user.id, content: trimmed })
          .select("id, content, created_at, updated_at")
          .single();
        if (error) throw error;
        setNote(data);
      }
      setEditingNote(false);
      onNoteChanged(conversationId, true);
      toast({ title: "Note saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to save note", variant: "destructive" });
    }
    setSavingNote(false);
  };

  const deleteNote = async () => {
    if (!note) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from("conversation_notes").delete().eq("id", note.id);
      if (error) throw error;
      setNote(null);
      setNoteText("");
      setEditingNote(false);
      onNoteChanged(conversationId, false);
      toast({ title: "Note deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to delete note", variant: "destructive" });
    }
    setSavingNote(false);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }} className="flex-1 flex flex-col">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-200 truncate">{conversationTitle || "Untitled"}</h2>
          <p className="text-[10px] text-gray-500">{studentName} · {new Date(createdAt).toLocaleDateString()}</p>
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
                <div className="w-7 h-7 rounded-full bg-teal-500/15 border border-teal-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-teal-400" />
                </div>
              )}
              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                isUser
                  ? "bg-teal-500/15 border border-teal-400/20 text-teal-100 rounded-br-md"
                  : "bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-bl-md"
              }`}>
                <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:text-[10px] [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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

      {/* Teacher Note Section */}
      <motion.div variants={fadeUp} className="mt-3 rounded-xl bg-amber-500/[0.04] border border-amber-400/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Teacher Note</span>
          {note && !editingNote && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setEditingNote(true)} className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-amber-300 transition-all" title="Edit note">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={deleteNote} disabled={savingNote} className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-all" title="Delete note">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {loadingNote ? (
          <p className="text-[10px] text-gray-600">Loading…</p>
        ) : note && !editingNote ? (
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              placeholder="Leave feedback or notes about this conversation…"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-400/40 resize-none transition-all"
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={saveNote}
                disabled={savingNote || !noteText.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Save
              </button>
              {editingNote && (
                <button
                  onClick={() => { setEditingNote(false); setNoteText(note?.content ?? ""); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
        {(editingNote || !note) && noteText.length > 0 && (
          <p className="text-[10px] text-gray-500 mt-1 text-right">{noteText.length}/{MAX_NOTE_LENGTH}</p>
        )}
      </motion.div>
    </motion.div>
  );
}
