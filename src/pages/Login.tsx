import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-4"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <NeuralLogo />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-blue-200/70">Next Gen Learning</span>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight mb-1">
            AI School
          </h1>
          <p className="text-xs text-gray-400">Sign in to continue your practice</p>
        </motion.div>

        {/* Form */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </motion.form>

        {/* Links */}
        <motion.div variants={fadeUp} className="text-center space-y-2">
          <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline block">
            Forgot password?
          </Link>
          <p className="text-[11px] text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
          </p>
        </motion.div>

        {/* ICP Footer */}
        <motion.div variants={fadeUp} className="pt-3 border-t border-white/5 text-center space-y-0.5">
          <p className="text-[9px] text-gray-600">ICP备案号：京ICP备2026XXXXXXXX号</p>
          <p className="text-[9px] text-gray-600">APP备案号：京ICP备2026XXXXXXXX号A</p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
