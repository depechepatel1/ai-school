import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [mockTasks, setMockTasks] = useState<Record<string, { type: string; text: string }[]>>({});

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const handleAddTaskSubmit = () => {
    if (!newTaskText || !selectedDate) return;
    const dateKey = formatDateKey(selectedDate);
    setMockTasks(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), { type: "user", text: newTaskText }] }));
    setSelectedDate(null);
    setNewTaskText("");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-up">
      <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-teal-400" /> {monthNames[month]} {year}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-gray-500 text-xs font-bold">{d}</div>
          ))}
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="aspect-square" />;
            const dateKey = formatDateKey(day);
            const tasks = mockTasks[dateKey] || [];
            const isToday = day.toDateString() === new Date().toDateString();
            const isReview = day.getDate() % 5 === 0;
            return (
              <div key={idx} onClick={() => setSelectedDate(day)} className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-all cursor-pointer group ${isToday ? 'bg-teal-600 text-white border-teal-400' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                <span className="text-xs">{day.getDate()}</span>
                <div className="flex gap-1 mt-1">
                  {isReview && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  {tasks.some(t => t.type === 'due') && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  {tasks.some(t => t.type === 'user') && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-gray-400 px-2 mt-4">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Review</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Due</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> My Tasks</div>
        </div>

        {selectedDate && (
          <div className="absolute inset-0 bg-gray-900/95 z-[60] flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in-up">
            <h3 className="text-white font-bold mb-4">Add Task for {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}</h3>
            <input autoFocus type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="e.g., Vocab Review..." className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white mb-4 focus:border-blue-500 outline-none" />
            <div className="flex gap-3 w-full">
              <button onClick={() => setSelectedDate(null)} className="flex-1 py-2 bg-gray-800 rounded-lg text-gray-300">Cancel</button>
              <button onClick={handleAddTaskSubmit} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-bold">Add Task</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
