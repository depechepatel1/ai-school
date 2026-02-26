import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, GraduationCap, Users, Heart, X, ArrowLeft } from "lucide-react";
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

const LEGAL_VIDEO = "https://res.cloudinary.com/daujjfaqg/video/upload/Subtle_Background_Animation_Generation_brjkvo.mp4";

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
      {/* Video background */}
      <video
        src={LEGAL_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* Glass card — full width with padding */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl mx-6 max-h-[85vh] rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        {/* Close / Back button */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回注册
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(85vh-60px)] scrollbar-hide">
          {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Signup page ── */

export default function Signup() {
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

        {/* Role Selector */}
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

          {/* PRC Consent */}
          <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-start gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <label htmlFor="agree" className="text-[11px] leading-snug text-gray-300 cursor-pointer">
                我已阅读并同意{" "}
                <button type="button" onClick={() => setLegalModal("terms")} className="text-blue-400 hover:underline">《用户协议》</button>
                {" "}和{" "}
                <button type="button" onClick={() => setLegalModal("privacy")} className="text-blue-400 hover:underline">《隐私政策》</button>
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
                    <Checkbox id="guardian-agree" checked={guardianAgreed} onCheckedChange={(v) => setGuardianAgreed(v === true)} className="mt-0.5" />
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

      {/* Legal Modal Overlay */}
      <AnimatePresence>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </AnimatePresence>
    </PageShell>
  );
}
