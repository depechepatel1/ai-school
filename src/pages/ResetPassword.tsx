import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updatePassword(password);
      toast({ title: t("reset.success"), description: t("reset.successDesc") });
      navigate("/login");
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
          <h1 className="text-3xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-white to-teal-300 leading-tight">
            {t("reset.title")}
          </h1>
          <p className="text-sm text-gray-400 mt-2">{t("reset.subtitle")}</p>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 pl-1">{t("reset.newPassword")}</label>
            <input
              type="password"
              placeholder={t("reset.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400/40 focus:bg-white/[0.06] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(20,184,166,0.25)]"
          >
            {isLoading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              t("reset.update")
            )}
          </button>
        </motion.form>
      </motion.div>
    </PageShell>
  );
}
