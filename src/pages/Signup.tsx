import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, UserPlus, GraduationCap, Users, Heart } from "lucide-react";

type AppRole = "student" | "teacher" | "parent";

const roles: { value: AppRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "student", label: "Student", icon: <GraduationCap className="w-5 h-5" />, desc: "Practice speaking" },
  { value: "teacher", label: "Teacher", icon: <Users className="w-5 h-5" />, desc: "Manage classes" },
  { value: "parent", label: "Parent", icon: <Heart className="w-5 h-5" />, desc: "Track progress" },
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianAgreed, setGuardianAgreed] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const canSubmit = agreed && (!isMinor || guardianAgreed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      await signUp(email, password, displayName, selectedRole);
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Signup failed", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 orange-glow mb-2">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
            <p className="text-muted-foreground text-sm">Join IELTS Speaking Studio</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all ${
                      selectedRole === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    {r.icon}
                    <span className="font-medium">{r.label}</span>
                    <span className="text-[10px] opacity-70">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {/* PRC Consent Section */}
            <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                />
                <label htmlFor="agree" className="text-sm leading-snug text-foreground/90 cursor-pointer">
                  我已阅读并同意{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">《用户协议》</Link>
                  {" "}和{" "}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">《隐私政策》</Link>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="minor-mode" className="text-sm text-muted-foreground cursor-pointer">
                  未成年人模式 (Minor Mode) / 不满14周岁
                </Label>
                <Switch
                  id="minor-mode"
                  checked={isMinor}
                  onCheckedChange={(v) => {
                    setIsMinor(v);
                    if (!v) setGuardianAgreed(false);
                  }}
                />
              </div>

              <AnimatePresence>
                {isMinor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 pt-2 border-t border-border">
                      <Checkbox
                        id="guardian-agree"
                        checked={guardianAgreed}
                        onCheckedChange={(v) => setGuardianAgreed(v === true)}
                      />
                      <label htmlFor="guardian-agree" className="text-sm leading-snug text-foreground/90 cursor-pointer">
                        我已获得监护人同意，且监护人已阅读并同意上述协议
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button type="submit" className="w-full orange-glow" disabled={isLoading || !canSubmit}>
              <UserPlus className="w-4 h-4 mr-2" />
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>

          {/* ICP Filing Footer */}
          <div className="pt-4 border-t border-border text-center space-y-1">
            <p className="text-[11px] text-muted-foreground/60">ICP备案号：京ICP备2026XXXXXXXX号</p>
            <p className="text-[11px] text-muted-foreground/60">APP备案号：京ICP备2026XXXXXXXX号A</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
