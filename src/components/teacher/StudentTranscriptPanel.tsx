/**
 * StudentTranscriptPanel — lightweight shell using extracted sub-components.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConversationListView from "./ConversationListView";
import ConversationDetailView from "./ConversationDetailView";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentTranscriptPanelProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

export default function StudentTranscriptPanel({ studentId, studentName, onBack }: StudentTranscriptPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notedConvoIds, setNotedConvoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoadingConvos(true);
      const [convosRes, notesRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, title, created_at, updated_at")
          .eq("user_id", studentId)
          .order("updated_at", { ascending: false }),
        supabase.from("conversation_notes").select("conversation_id"),
      ]);
      setConversations(convosRes.data ?? []);
      setNotedConvoIds(new Set((notesRes.data ?? []).map((n) => n.conversation_id)));
      setLoadingConvos(false);
    };
    load();
  }, [studentId]);

  const handleNoteChanged = (convoId: string, hasNote: boolean) => {
    setNotedConvoIds((prev) => {
      const s = new Set(prev);
      if (hasNote) s.add(convoId);
      else s.delete(convoId);
      return s;
    });
  };

  if (selectedConvo) {
    return (
      <ConversationDetailView
        conversationId={selectedConvo.id}
        conversationTitle={selectedConvo.title}
        studentName={studentName}
        createdAt={selectedConvo.created_at}
        onBack={() => setSelectedConvo(null)}
        onNoteChanged={handleNoteChanged}
      />
    );
  }

  return (
    <ConversationListView
      studentName={studentName}
      conversations={conversations}
      loading={loadingConvos}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      notedConvoIds={notedConvoIds}
      onSelect={setSelectedConvo}
      onBack={onBack}
    />
  );
}
