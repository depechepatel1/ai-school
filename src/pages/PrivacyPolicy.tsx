import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回注册
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="prose prose-invert max-w-none space-y-6"
        >
          <h1 className="text-3xl font-bold text-foreground">隐私政策 (Privacy Policy)</h1>
          <p className="text-muted-foreground">生效日期：2026年2月</p>
          <p className="text-foreground/90 leading-relaxed">
            本隐私政策依据《中华人民共和国个人信息保护法》(PIPL)、《数据安全法》及2025年《网络数据安全管理条例》制定。
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. 我们收集的信息及使用目的</h2>
            <p className="text-foreground/90 leading-relaxed">
              我们坚持"单独同意"原则，绝不强制捆绑授权。为提供雅思（IELTS）口语及中式英语（Chinglish）纠音服务，我们需要：
            </p>
            <ul className="space-y-3 list-none pl-0">
              <li className="pl-4 border-l-2 border-primary/40">
                <strong className="text-foreground">真实身份核验：</strong>
                <span className="text-foreground/80">
                  依据《网络安全法》，我们仅通过手机号码（SMS短信）进行实名认证。我们明确拒绝且不收集、不存储任何面部识别生物特征数据。
                </span>
              </li>
              <li className="pl-4 border-l-2 border-primary/40">
                <strong className="text-foreground">学习与语音数据：</strong>
                <span className="text-foreground/80">
                  我们收集您的语音录音和练习日志，专门用于AI口语评估和母语（L1）干扰错误分析。
                </span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. 数据存储与跨境传输 (数据本地化)</h2>
            <p className="text-foreground/90 leading-relaxed">
              您产生的所有个人信息及敏感数据均严格存储于中华人民共和国境内。我们使用国内合规的 Memfire 数据库进行数据托管，绝不存在任何未经授权的敏感个人信息跨境转移。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. 第三方SDK信息披露矩阵</h2>
            <p className="text-foreground/90 leading-relaxed">
              为保障应用运行及提供AI服务，我们接入了以下第三方SDK：
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-foreground"><strong>SDK名称：</strong>Memfire</p>
                <p className="text-foreground/80"><strong>处理目的：</strong>用户身份认证与境内数据存储</p>
                <p className="text-foreground/80"><strong>收集数据：</strong>手机号、设备标识符、应用日志</p>
                <p className="text-foreground/80"><strong>隐私链接：</strong><span className="text-primary">[Memfire官方隐私政策]</span></p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-foreground"><strong>SDK名称：</strong>阿里云 (Aliyun)</p>
                <p className="text-foreground/80"><strong>处理目的：</strong>提供生成式大语言模型(LLM)驱动的口语评分与对话服务</p>
                <p className="text-foreground/80"><strong>收集数据：</strong>语音输入流、文本交互记录</p>
                <p className="text-foreground/80"><strong>隐私链接：</strong><span className="text-primary">[阿里云官方隐私政策]</span></p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. 儿童个人信息保护规则及未成年人模式</h2>
            <p className="text-foreground/90 leading-relaxed">
              我们严格遵守2024年《未成年人网络保护条例》及2026年未成年人个人信息合规审计要求。若您是不满14周岁的未成年人，必须由您的法定监护人阅读并单独勾选同意本政策后，方可使用本产品。平台内置"未成年人模式"，限制使用时长并提供内容过滤。
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
