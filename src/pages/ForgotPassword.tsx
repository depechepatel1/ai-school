import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function ForgotPassword() {
  usePageTitle("Forgot Password");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast({ title: t("forgot.checkEmail"), description: t("forgot.resetLinkSent") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: getSafeErrorMessage(err), variant: "destructive" });
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
          <div className="flex justify-center mb-3">
            <NeuralLogo />
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">
            {t("brand.title")}
          </h1>
          <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/15 text-[10px] font-semibold tracking-widest uppercase text-blue-300/80">
            {t("brand.edition")}
          </span>
          <p className="text-sm text-gray-400 mt-2">
            {sent ? t("forgot.sent") : t("forgot.subtitle")}
          </p>
        </motion.div>

        {sent ? (
          <motion.div variants={fadeUp} className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-300">{t("forgot.emailSentTo")} <span className="text-white font-medium">{email}</span></p>
              <p className="text-xs text-gray-500">{t("forgot.checkSpam")}</p>
            </div>
            <Link to="/login">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t("forgot.backToLogin")}
              </button>
            </Link>
          </motion.div>
        ) : (
          <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 pl-1">{t("forgot.emailLabel")}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(37,99,235,0.25)]"
            >
              {isLoading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {t("forgot.send")}
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Back link */}
        {!sent && (
          <motion.div variants={fadeUp} className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("forgot.backToLogin")}
            </Link>
          </motion.div>
        )}
      </motion.div>
    </PageShell>
  );
}
