import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Copy, Users, BarChart3, MessageSquare, LogOut, BookOpen } from "lucide-react";

interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
    if (data) setClasses(data);
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    setIsCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("classes").insert({ name: newClassName.trim(), created_by: user.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewClassName("");
      loadClasses();
      toast({ title: "Class created!" });
    }
    setIsCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Join code ${code} copied to clipboard.` });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Teacher Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Create class */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Create a New Class</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="className" className="sr-only">Class Name</Label>
              <Input id="className" placeholder="e.g. IELTS Band 7 Group" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
            </div>
            <Button onClick={createClass} disabled={isCreating || !newClassName.trim()}>
              <Plus className="w-4 h-4 mr-2" /> Create
            </Button>
          </div>
        </motion.div>

        {/* Classes grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 space-y-4"
            >
              <h3 className="font-semibold text-foreground">{c.name}</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-1.5 bg-secondary/50 rounded-md text-sm text-primary font-mono">{c.join_code}</code>
                <Button variant="ghost" size="icon" onClick={() => copyCode(c.join_code)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 0 students</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Placeholder sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: <BarChart3 className="w-5 h-5" />, title: "Student Analytics", desc: "Track student progress and performance (coming soon)" },
            { icon: <MessageSquare className="w-5 h-5" />, title: "Conversation Review", desc: "Review and provide feedback on student conversations (coming soon)" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} className="glass-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">{item.icon}</div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
