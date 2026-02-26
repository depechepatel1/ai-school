import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LogOut, BookOpen, Users, BarChart3, Clock } from "lucide-react";

export default function ParentDashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Parent Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center space-y-3">
          <Users className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Link to Your Child</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter your child's student code or email to link their account and track their progress. (Coming soon)
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: <BarChart3 className="w-5 h-5" />, title: "Progress Overview", desc: "View your child's learning progress and scores (coming soon)" },
            { icon: <Clock className="w-5 h-5" />, title: "Recent Activity", desc: "See your child's latest practice sessions (coming soon)" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }} className="glass-card p-6 flex items-start gap-4">
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
