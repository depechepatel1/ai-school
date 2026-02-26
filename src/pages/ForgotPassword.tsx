import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast({ title: "Check your email", description: "A password reset link has been sent." });
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
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
        className="flex-1 flex flex-col justify-between"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <NeuralLogo />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight mb-1">
            Reset Password
          </h1>
          <p className="text-xs text-gray-400">We'll send you a reset link</p>
        </motion.div>

        {sent ? (
          <motion.div variants={fadeUp} className="text-center space-y-4">
            <Mail className="w-10 h-10 text-blue-400 mx-auto" />
            <p className="text-sm text-gray-300">Check your email for the reset link.</p>
            <Link to="/login">
              <button className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                Back to Login
              </button>
            </Link>
          </motion.div>
        ) : (
          <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </motion.form>
        )}

        <motion.div variants={fadeUp}>
          <Link to="/login" className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
