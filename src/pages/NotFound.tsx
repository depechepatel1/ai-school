import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";
import PageShell from "@/components/PageShell";

const NotFound = () => {
  return (
    <PageShell hideFooter>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
          <AlertTriangle className="w-8 h-8 text-teal-400" />
        </div>
        <h1 className="text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-white to-teal-300 mb-3">
          404
        </h1>
        <p className="text-lg text-white/60 mb-8">Oops! Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(20,184,166,0.25)] hover:shadow-[0_0_40px_rgba(20,184,166,0.4)]"
        >
          <Home className="w-4 h-4" />
          Return to Home
        </Link>
      </motion.div>
    </PageShell>
  );
};

export default NotFound;
