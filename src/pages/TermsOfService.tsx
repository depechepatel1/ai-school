import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-foreground">用户协议 (User Agreement)</h1>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. 平台性质定义</h2>
            <p className="text-foreground/90 leading-relaxed">
              本平台是一款针对雅思及IGCSE备考提供异步AI辅助工具、算法学习路径和数字化内容的"创新型教育软件产品"。本平台不组织系统性、同步的人工教育培训活动，不属于受《关于进一步减轻义务教育阶段学生作业负担和校外培训负担的意见》（"双减"政策）规制的线下或线上学科类校外培训机构。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. 内容规范与"九不准"</h2>
            <p className="text-foreground/90 leading-relaxed">
              用户在此平台生成、传输、存储的所有内容必须严格遵守国家法律法规。平台对2026年《未成年人网络可能影响身心健康信息分类标准》及"九不准"原则享有绝对的、单方面的执行权。若用户利用平台或集成的AI服务生成、传播危害国家安全、颠覆国家政权、破坏社会稳定或违背公序良俗的内容，平台有权在不事先通知的情况下，立即停止生成、删除违法内容、终止账号服务并向公安机关报告。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. 未成年人消费限制</h2>
            <p className="text-foreground/90 leading-relaxed">
              针对高中阶段（14-18周岁）用户，本平台严格执行消费上限：单次交易或充值金额不得超过100元人民币，单月累计消费金额不得超过400元人民币。大额课程订阅必须由成年监护人通过实名认证的支付账户完成。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. 知识产权与AI生成内容</h2>
            <p className="text-foreground/90 leading-relaxed">
              本平台提供的所有数字化学习材料、L1错误纠正模型及由AI系统生成的定制化学案，其知识产权均归属本公司所有。用户仅获得个人、非商业性的使用许可。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. 法律适用与争议解决</h2>
            <p className="text-foreground/90 leading-relaxed">
              本协议的签署、效力、解释及争议解决均适用中华人民共和国法律（不包括冲突法）。双方如发生争议，应首先进行为期30天的友好协商；协商不成的，任何一方均必须将争议提交至中国国际经济贸易仲裁委员会（CIETAC）北京总会，按照其届时有效的仲裁规则进行具有法律约束力的仲裁。
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
