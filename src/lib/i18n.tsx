import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "zh";

const translations: Record<string, Record<Lang, string>> = {
  // Brand
  "brand.subtitle": { en: "Next Gen Learning", zh: "新一代智能学习" },
  "brand.title": { en: "AI School", zh: "AI 学校" },
  "brand.edition": { en: "IELTS Edition", zh: "雅思版" },

  // Auth - Login
  "login.subtitle": { en: "Sign in to continue your practice", zh: "登录以继续练习" },
  "login.email": { en: "Email", zh: "邮箱" },
  "login.password": { en: "Password", zh: "密码" },
  "login.emailPlaceholder": { en: "you@example.com", zh: "you@example.com" },
  "login.passwordPlaceholder": { en: "••••••••", zh: "••••••••" },
  "login.forgotPassword": { en: "Forgot password?", zh: "忘记密码？" },
  "login.signIn": { en: "Sign In", zh: "登录" },
  "login.newHere": { en: "New here?", zh: "新用户？" },
  "login.createAccount": { en: "Create an Account", zh: "创建账户" },
  "login.failed": { en: "Login failed", zh: "登录失败" },

  // Auth - Signup
  "signup.displayName": { en: "Display Name", zh: "显示名称" },
  "signup.email": { en: "Email", zh: "邮箱" },
  "signup.password": { en: "Password (min 6 chars)", zh: "密码（至少6位）" },
  "signup.createAccount": { en: "Create Account", zh: "创建账户" },
  "signup.creating": { en: "Creating...", zh: "创建中..." },
  "signup.alreadyHaveAccount": { en: "Already have an account?", zh: "已有账户？" },
  "signup.signIn": { en: "Sign in", zh: "登录" },
  "signup.created": { en: "Account created!", zh: "账户已创建！" },
  "signup.verifyEmail": { en: "Please check your email to verify your account.", zh: "请查看邮箱验证您的账户。" },
  "signup.failed": { en: "Signup failed", zh: "注册失败" },
  "signup.minorMode": { en: "Minor mode / Under 14", zh: "未成年人模式 / 不满14周岁" },

  // Roles
  "role.student": { en: "Student", zh: "学生" },
  "role.teacher": { en: "Teacher", zh: "教师" },
  "role.parent": { en: "Parent", zh: "家长" },

  // Portal labels
  "portal.student": { en: "Student Portal", zh: "学生门户" },
  "portal.teacher": { en: "Teacher Portal", zh: "教师门户" },
  "portal.parent": { en: "Parent Portal", zh: "家长门户" },

  // Forgot Password
  "forgot.subtitle": { en: "We'll send you a reset link", zh: "我们会发送重置链接" },
  "forgot.sent": { en: "Check your inbox for the reset link", zh: "请查看收件箱中的重置链接" },
  "forgot.emailLabel": { en: "Email Address", zh: "邮箱地址" },
  "forgot.send": { en: "Send Reset Link", zh: "发送重置链接" },
  "forgot.backToLogin": { en: "Back to Login", zh: "返回登录" },
  "forgot.emailSentTo": { en: "Email sent to", zh: "邮件已发送至" },
  "forgot.checkSpam": { en: "If you don't see it, check your spam folder.", zh: "如未收到，请检查垃圾邮件文件夹。" },
  "forgot.checkEmail": { en: "Check your email", zh: "请查看邮箱" },
  "forgot.resetLinkSent": { en: "A password reset link has been sent.", zh: "密码重置链接已发送。" },

  // Reset Password
  "reset.title": { en: "Set New Password", zh: "设置新密码" },
  "reset.subtitle": { en: "Enter your new password below", zh: "请在下方输入新密码" },
  "reset.newPassword": { en: "New Password", zh: "新密码" },
  "reset.placeholder": { en: "Min 6 characters", zh: "至少6位字符" },
  "reset.update": { en: "Update Password", zh: "更新密码" },
  "reset.updating": { en: "Updating...", zh: "更新中..." },
  "reset.success": { en: "Password updated!", zh: "密码已更新！" },
  "reset.successDesc": { en: "You can now sign in with your new password.", zh: "您现在可以使用新密码登录。" },

  // Student
  "student.readyTitle": { en: "Ready to Practice?", zh: "准备好练习了吗？" },
  "student.readyDesc": { en: "Start a conversation to practice English speaking with AI.", zh: "开始对话，与AI练习英语口语。" },
  "student.startChat": { en: "Start Chat", zh: "开始对话" },
  "student.newChat": { en: "New Chat", zh: "新对话" },
  "student.inputPlaceholder": { en: "Type or hold mic...", zh: "输入或按住麦克风..." },
  "student.signOut": { en: "Sign Out", zh: "退出登录" },

  // Teacher
  "teacher.newClassPlaceholder": { en: "New class name...", zh: "新班级名称..." },
  "teacher.create": { en: "Create", zh: "创建" },
  "teacher.noClasses": { en: "No classes yet. Create one above!", zh: "暂无班级，请在上方创建！" },
  "teacher.classCreated": { en: "Class created!", zh: "班级已创建！" },
  "teacher.copied": { en: "Copied!", zh: "已复制！" },
  "teacher.joinCodeCopied": { en: "Join code copied.", zh: "加入码已复制。" },
  "teacher.studentAnalytics": { en: "Student Analytics", zh: "学生分析" },
  "teacher.conversationReview": { en: "Conversation Review", zh: "对话回顾" },
  "teacher.soon": { en: "Soon", zh: "即将推出" },

  // Parent
  "parent.linkTitle": { en: "Link Your Child's Account", zh: "关联孩子的账户" },
  "parent.linkDesc": { en: "Enter your child's student code to link their account and track their learning progress.", zh: "输入孩子的学生码以关联账户并跟踪学习进度。" },
  "parent.linkButton": { en: "Link Account", zh: "关联账户" },
  "parent.progressOverview": { en: "Progress Overview", zh: "进度概览" },
  "parent.progressDesc": { en: "View learning stats, scores, and improvement trends", zh: "查看学习统计、分数和进步趋势" },
  "parent.recentActivity": { en: "Recent Activity", zh: "最近活动" },
  "parent.recentDesc": { en: "See latest practice sessions and time spent", zh: "查看最近的练习和用时" },
  "parent.comingSoon": { en: "Coming Soon", zh: "即将推出" },

  // Mic denied
  "mic.blocked": { en: "Microphone blocked", zh: "麦克风被阻止" },
  "mic.hint": { en: "Click the {icon} lock icon in your browser's address bar, then allow microphone access.", zh: "点击浏览器地址栏中的 {icon} 锁图标，然后允许麦克风访问。" },
  "mic.tryAgain": { en: "Try again", zh: "重试" },

  // Common
  "common.signOut": { en: "Sign Out", zh: "退出登录" },
  "common.error": { en: "Error", zh: "错误" },
  "common.compliance": { en: "Data Resides in Mainland China (Aliyun)", zh: "数据存储于中国大陆（阿里云）" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = safeGetItem("app-lang");
    return (stored === "en" || stored === "zh") ? stored : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    safeSetItem("app-lang", l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
