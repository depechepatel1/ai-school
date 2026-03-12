/**
 * Conversation list view with search.
 * Extracted from StudentTranscriptPanel.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, ChevronRight, Search, X, StickyNote } from "lucide-react";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationListViewProps {
  studentName: string;
  conversations: Conversation[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  notedConvoIds: Set<string>;
  onSelect: (convo: Conversation) => void;
  onBack: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ConversationListView({
  studentName,
  conversations,
  loading,
  searchQuery,
  onSearchChange,
  notedConvoIds,
  onSelect,
  onBack,
}: ConversationListViewProps) {
  const q = searchQuery.toLowerCase().trim();
  const filteredConversations = useMemo(
    () => (q ? conversations.filter((c) => (c.title || "Untitled").toLowerCase().includes(q)) : conversations),
    [conversations, q]
  );

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

      {conversations.length > 0 && (
        <motion.div variants={fadeUp} className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400/40 focus:bg-white/[0.06] transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5">
        {loading && <p className="text-center text-xs text-gray-600 py-8">Loading…</p>}
        {!loading && conversations.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-5 h-5 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No conversations yet</p>
          </div>
        )}
        {!loading && conversations.length > 0 && filteredConversations.length === 0 && (
          <div className="text-center py-8">
            <Search className="w-5 h-5 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No conversations match "{searchQuery}"</p>
          </div>
        )}
        {filteredConversations.map((c) => (
          <motion.div
            key={c.id}
            variants={fadeUp}
            onClick={() => onSelect(c)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/[0.08] border border-teal-400/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{c.title || "Untitled"}</p>
              <p className="text-[10px] text-gray-500">{new Date(c.updated_at).toLocaleDateString()}</p>
            </div>
            {notedConvoIds.has(c.id) && (
              <StickyNote className="w-3.5 h-3.5 text-amber-400/70" />
            )}
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
