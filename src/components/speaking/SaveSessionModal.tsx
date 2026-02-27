import { Save } from "lucide-react";

interface Props {
  onSave: () => void;
  onDiscard: () => void;
  isPartial: boolean;
}

export default function SaveSessionModal({ onSave, onDiscard, isPartial }: Props) {
  return (
    <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-[400px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)] flex flex-col items-center text-center">
        <Save className="w-12 h-12 text-purple-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{isPartial ? "Save Partial Session?" : "Test Completed"}</h3>
        <p className="text-sm text-gray-400 mb-6">
          {isPartial ? "You cancelled the test early. Would you like to save the parts you completed?" : "Great job! Would you like to save this recording to your history?"}
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onDiscard} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-colors font-bold text-sm">Discard</button>
          <button onClick={onSave} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 transition-colors font-bold text-sm">Save Session</button>
        </div>
      </div>
    </div>
  );
}
