import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, GraduationCap, Users, Heart, X, ArrowLeft } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";

type AppRole = "student" | "teacher" | "parent";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};



/* ── Inline legal content components ── */

function PrivacyContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">隐私政策 (Privacy Policy)</h1>
      <p className="text-[10px] text-muted-foreground">生效日期：2026年2月</p>
      <p className="text-xs text-foreground/90 leading-relaxed">
        本隐私政策依据《中华人民共和国个人信息保护法》(PIPL)、《数据安全法》及2025年《网络数据安全管理条例》制定。
      </p>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">1. 我们收集的信息及使用目的</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          我们坚持"单独同意"原则，绝不强制捆绑授权。为提供雅思（IELTS）口语及中式英语（Chinglish）纠音服务，我们需要：
        </p>
        <ul className="space-y-1.5 text-xs text-foreground/80">
          <li className="pl-3 border-l-2 border-primary/40">
            <strong className="text-foreground">真实身份核验：</strong>
            依据《网络安全法》，我们仅通过手机号码（SMS短信）进行实名认证。我们明确拒绝且不收集、不存储任何面部识别生物特征数据。
          </li>
          <li className="pl-3 border-l-2 border-primary/40">
            <strong className="text-foreground">学习与语音数据：</strong>
            我们收集您的语音录音和练习日志，专门用于AI口语评估和母语（L1）干扰错误分析。
          </li>
        </ul>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">2. 数据存储与跨境传输</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          您产生的所有个人信息及敏感数据均严格存储于中华人民共和国境内。我们使用国内合规的 Memfire 数据库进行数据托管，绝不存在任何未经授权的敏感个人信息跨境转移。
        </p>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">3. 第三方SDK信息披露矩阵</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">为保障应用运行及提供AI服务，我们接入了以下第三方SDK：</p>
        <div className="space-y-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-0.5 text-[11px]">
            <p className="text-foreground"><strong>SDK名称：</strong>Memfire</p>
            <p className="text-foreground/70"><strong>处理目的：</strong>用户身份认证与境内数据存储</p>
            <p className="text-foreground/70"><strong>收集数据：</strong>手机号、设备标识符、应用日志</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-0.5 text-[11px]">
            <p className="text-foreground"><strong>SDK名称：</strong>阿里云 (Aliyun)</p>
            <p className="text-foreground/70"><strong>处理目的：</strong>提供生成式大语言模型(LLM)驱动的口语评分与对话服务</p>
            <p className="text-foreground/70"><strong>收集数据：</strong>语音输入流、文本交互记录</p>
          </div>
        </div>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">4. 儿童个人信息保护规则</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          我们严格遵守2024年《未成年人网络保护条例》及2026年未成年人个人信息合规审计要求。若您是不满14周岁的未成年人，必须由您的法定监护人阅读并单独勾选同意本政策后，方可使用本产品。
        </p>
      </section>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">用户协议 (User Agreement)</h1>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">1. 平台性质定义</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          本平台是一款针对雅思及IGCSE备考提供异步AI辅助工具、算法学习路径和数字化内容的"创新型教育软件产品"。本平台不组织系统性、同步的人工教育培训活动，不属于受"双减"政策规制的线下或线上学科类校外培训机构。
        </p>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">2. 内容规范与"九不准"</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          用户在此平台生成、传输、存储的所有内容必须严格遵守国家法律法规。平台对2026年《未成年人网络可能影响身心健康信息分类标准》及"九不准"原则享有绝对的、单方面的执行权。若用户利用平台或集成的AI服务生成、传播违法内容，平台有权立即停止生成、删除违法内容、终止账号服务并向公安机关报告。
        </p>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">3. 未成年人消费限制</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          针对高中阶段（14-18周岁）用户，本平台严格执行消费上限：单次交易或充值金额不得超过100元人民币，单月累计消费金额不得超过400元人民币。大额课程订阅必须由成年监护人通过实名认证的支付账户完成。
        </p>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">4. 知识产权与AI生成内容</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          本平台提供的所有数字化学习材料、L1错误纠正模型及由AI系统生成的定制化学案，其知识产权均归属本公司所有。用户仅获得个人、非商业性的使用许可。
        </p>
      </section>
      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">5. 法律适用与争议解决</h2>
        <p className="text-xs text-foreground/90 leading-relaxed">
          本协议的签署、效力、解释及争议解决均适用中华人民共和国法律。双方如发生争议，应首先进行为期30天的友好协商；协商不成的，任何一方均必须将争议提交至中国国际经济贸易仲裁委员会（CIETAC）北京总会进行仲裁。
        </p>
      </section>
    </div>
  );
}

/* ── Full-screen legal modal overlay ── */

function LegalModal({ type, onClose }: { type: "privacy" | "terms"; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/80" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl mx-6 max-h-[85vh] rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="shrink-0 z-20 flex items-center justify-between px-6 py-5 pt-6 bg-black/40 backdrop-blur-md border-b border-white/5">
          <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            返回注册
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-8 py-6 overflow-y-auto flex-1 scrollbar-hide">
          {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Signup page ── */

export default function Signup() {
  usePageTitle("Sign Up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianAgreed, setGuardianAgreed] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const roles: { value: AppRole; label: string; icon: React.ReactNode }[] = [
    { value: "student", label: t("role.student"), icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { value: "teacher", label: t("role.teacher"), icon: <Users className="w-3.5 h-3.5" /> },
    { value: "parent", label: t("role.parent"), icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  const canSubmit = agreed && (!isMinor || guardianAgreed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      await signUp(email, password, displayName, selectedRole);
      // Auto-login after signup (auto-confirm is enabled)
      try {
        const { signIn } = useAuth();
      } catch {}
      toast({ title: t("signup.created"), description: "Welcome! Redirecting…" });
      // Navigate to role-appropriate page
      const roleRoutes: Record<string, string> = { student: "/select-week", teacher: "/teacher", parent: "/parent" };
      navigate(roleRoutes[selectedRole] || "/", { replace: true });
    } catch (err: any) {
      toast({ title: t("signup.failed"), description: getSafeErrorMessage(err), variant: "destructive" });
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
        className="flex-1 flex flex-col"
      >
        {/* Language Toggle */}
        <motion.div variants={fadeUp} className="flex justify-end mb-1">
          <LanguageToggle />
        </motion.div>

        {/* Compact Header */}
        <motion.div variants={fadeUp} className="text-center mb-4">
          <div className="flex justify-center items-center gap-2 mb-1.5">
            <NeuralLogo />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-blue-200/70">{t("brand.subtitle")}</span>
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">
            {t("brand.title")}
          </h1>
          <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/15 text-[10px] font-semibold tracking-widest uppercase text-blue-300/80">
            {t("brand.edition")}
          </span>
        </motion.div>

        {/* Role Selector */}
        <motion.div variants={fadeUp} className="flex gap-1.5 justify-center mb-4">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelectedRole(r.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                selectedRole === r.value
                  ? "bg-blue-500/20 text-blue-200 border border-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  : "bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:border-white/15 hover:text-gray-400"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </motion.div>

        {/* Form — fills remaining space */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-3">
          <div className="space-y-2.5">
            <input
              placeholder={t("signup.displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
            />
            <input
              type="email"
              placeholder={t("signup.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
            />
            <input
              type="password"
              placeholder={t("signup.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* PRC Consent */}
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-start gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <label htmlFor="agree" className="text-[11px] leading-snug text-gray-400 cursor-pointer">
                我已阅读并同意{" "}
                <button type="button" onClick={() => setLegalModal("terms")} className="text-blue-400 hover:underline">《用户协议》</button>
                {" "}和{" "}
                <button type="button" onClick={() => setLegalModal("privacy")} className="text-blue-400 hover:underline">《隐私政策》</button>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{t("signup.minorMode")}</span>
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
                    <Checkbox id="guardian-agree" checked={guardianAgreed} onCheckedChange={(v) => setGuardianAgreed(v === true)} className="mt-0.5" />
                    <label htmlFor="guardian-agree" className="text-[11px] leading-snug text-gray-400 cursor-pointer">
                      我已获得监护人同意，且监护人已阅读并同意上述协议
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacer to push button + footer down */}
          <div className="flex-1 min-h-2" />

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_25px_rgba(37,99,235,0.25)]"
          >
            <UserPlus className="w-4 h-4" />
            {isLoading ? t("signup.creating") : t("signup.createAccount")}
          </button>

          {/* Sign-in link + ICP */}
          <div className="text-center space-y-2 pt-1">
            <p className="text-[11px] text-gray-500">
              {t("signup.alreadyHaveAccount")}{" "}
              <Link to="/login" className="text-blue-400 hover:underline">{t("signup.signIn")}</Link>
            </p>
            <div className="pt-2 border-t border-white/[0.04] space-y-0.5">
              <p className="text-[8px] text-gray-600/60">ICP备案号：京ICP备2026000001号</p>
              <p className="text-[8px] text-gray-600/60">APP备案号：京ICP备2026000001号A</p>
            </div>
          </div>
        </motion.form>
      </motion.div>

      {/* Legal Modal Overlay */}
      <AnimatePresence>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </AnimatePresence>
    </PageShell>
  );
}
