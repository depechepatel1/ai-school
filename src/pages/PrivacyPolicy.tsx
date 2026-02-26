import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";

const LEGAL_VIDEO = "https://res.cloudinary.com/daujjfaqg/video/upload/Subtle_Background_Animation_Generation_brjkvo.mp4";

export default function PrivacyPolicy() {
  return (
    <PageShell customVideoUrl={LEGAL_VIDEO}>
      <div className="space-y-4">
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回注册
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
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
            <p className="text-xs text-foreground/90 leading-relaxed">
              为保障应用运行及提供AI服务，我们接入了以下第三方SDK：
            </p>
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
        </motion.article>
      </div>
    </PageShell>
  );
}
