import { useLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-[10px] font-bold tracking-wide hover:bg-white/[0.1] transition-all select-none"
      title={lang === "en" ? "切换到中文" : "Switch to English"}
    >
      <span className={lang === "en" ? "text-blue-300" : "text-gray-500"}>EN</span>
      <span className="text-gray-500">/</span>
      <span className={lang === "zh" ? "text-blue-300" : "text-gray-500"}>中</span>
    </button>
  );
}
