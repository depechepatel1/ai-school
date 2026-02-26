import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, GraduationCap, Users, Heart } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

type AppRole = "student" | "teacher" | "parent";

const roles: { value: AppRole; label: string; icon: React.ReactNode }[] = [
  { value: "student", label: "Student", icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { value: "teacher", label: "Teacher", icon: <Users className="w-3.5 h-3.5" /> },
  { value: "parent", label: "Parent", icon: <Heart className="w-3.5 h-3.5" /> },
];

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

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
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="space-y-3"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <NeuralLogo />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-blue-200/70">Next Gen Learning</span>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">
            AI School
          </h1>
          <div className="flex justify-center mt-1.5 mb-2">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-400/20 backdrop-blur-md">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-200/80">IELTS Edition</span>
            </div>
          </div>
        </motion.div>

        {/* Role Selector — inline pills */}
        <motion.div variants={fadeUp} className="flex gap-1.5 justify-center">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelectedRole(r.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                selectedRole === r.value
                  ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
                  : "bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </motion.div>

        {/* Form */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-2.5">
          <input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
          />

          {/* PRC Consent — compact */}
          <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="agree" className="text-[11px] leading-snug text-gray-300 cursor-pointer">
                我已阅读并同意{" "}
                <Link to="/terms" className="text-blue-400 hover:underline" target="_blank">《用户协议》</Link>
                {" "}和{" "}
                <Link to="/privacy" className="text-blue-400 hover:underline" target="_blank">《隐私政策》</Link>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">未成年人模式 / 不满14周岁</span>
              <Switch
                id="minor-mode"
                checked={isMinor}
                onCheckedChange={(v) => { setIsMinor(v); if (!v) setGuardianAgreed(false); }}
                className="scale-75 origin-right"
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
                  <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                    <Checkbox
                      id="guardian-agree"
                      checked={guardianAgreed}
                      onCheckedChange={(v) => setGuardianAgreed(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="guardian-agree" className="text-[11px] leading-snug text-gray-300 cursor-pointer">
                      我已获得监护人同意，且监护人已阅读并同意上述协议
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            <UserPlus className="w-4 h-4" />
            {isLoading ? "Creating..." : "Create Account"}
          </button>
        </motion.form>

        {/* Links */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-[11px] text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
          </p>
        </motion.div>

        {/* ICP Footer */}
        <motion.div variants={fadeUp} className="pt-2 border-t border-white/5 text-center space-y-0.5">
          <p className="text-[9px] text-gray-600">ICP备案号：京ICP备2026XXXXXXXX号</p>
          <p className="text-[9px] text-gray-600">APP备案号：京ICP备2026XXXXXXXX号A</p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
