import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import { z } from "zod";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      await signIn(result.data.email, result.data.password);
      navigate("/");
    } catch (err: any) {
      toast({ title: t("login.failed"), description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        className="flex-1 flex flex-col justify-center"
      >
        {/* Language Toggle */}
        <motion.div variants={fadeUp} className="flex justify-end mb-2">
          <LanguageToggle />
        </motion.div>

        {/* Brand */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-3">
            <NeuralLogo />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-teal-200/70">{t("brand.subtitle")}</span>
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-white to-teal-300 leading-tight">
            {t("brand.title")}
          </h1>
          <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-teal-500/10 border border-teal-400/15 text-[10px] font-semibold tracking-widest uppercase text-teal-300/80">
            {t("brand.edition")}
          </span>
          <p className="text-sm text-gray-400 mt-2">{t("login.subtitle")}</p>
        </motion.div>

        {/* Form */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 pl-1">{t("login.email")}</label>
              <input
                type="email"
                placeholder={t("login.emailPlaceholder")}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                className={`w-full h-11 px-4 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:bg-white/[0.06] transition-all ${errors.email ? "border-red-500/60 focus:border-red-400/60" : "border-white/[0.08] focus:border-teal-400/40"}`}
              />
              {errors.email && <p className="text-[10px] text-red-400 pl-1">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 pl-1">{t("login.password")}</label>
              <input
                type="password"
                placeholder={t("login.passwordPlaceholder")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                className={`w-full h-11 px-4 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:bg-white/[0.06] transition-all ${errors.password ? "border-red-500/60 focus:border-red-400/60" : "border-white/[0.08] focus:border-teal-400/40"}`}
              />
              {errors.password && <p className="text-[10px] text-red-400 pl-1">{errors.password}</p>}
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-[11px] text-teal-400/80 hover:text-teal-300 transition-colors">
              {t("login.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(20,184,166,0.25)] hover:shadow-[0_0_40px_rgba(20,184,166,0.4)]"
          >
            {isLoading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {t("login.signIn")}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </motion.form>

        {/* Divider + Signup */}
        <motion.div variants={fadeUp} className="mt-8 text-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">{t("login.newHere")}</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/[0.08] hover:border-white/15 hover:shadow-md transition-all"
          >
            {t("login.createAccount")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* ICP Footer */}
        <motion.div variants={fadeUp} className="mt-auto pt-6 text-center space-y-0.5">
          <p className="text-[8px] text-gray-600/60">ICP备案号：京ICP备2026XXXXXXXX号</p>
          <p className="text-[8px] text-gray-600/60">APP备案号：京ICP备2026XXXXXXXX号A</p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
