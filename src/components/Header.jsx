import React from "react";
import { motion } from "framer-motion";

export default function Header({ remaining }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <motion.h1 initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold">
        Memo • Workspace
      </motion.h1>

      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">남은 할 일</div>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="badge">
          {remaining}
        </motion.div>
      </div>
    </header>
  );
}