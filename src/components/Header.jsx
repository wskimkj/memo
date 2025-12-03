import React from "react";
import { motion } from "framer-motion";

export default function Header({ remaining, total }) {
  const done = total - remaining;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  return (
    <header className="flex flex-col gap-3 mb-6">
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            Memo • Workspace
          </h1>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/70 border border-white/60 shadow-sm">
              오늘 · {dateLabel}
            </span>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 text-right">
            남은 할 일{" "}
            <span className="font-semibold text-gray-900">{remaining}</span> /
            전체{" "}
            <span className="font-semibold text-gray-900">{total}</span>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="badge"
          >
            {remaining}
          </motion.div>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-white/60 border border-white/70 overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="h-full"
          style={{
            background: "linear-gradient(90deg,#7b5cfa,#a084ff)"
          }}
        />
      </div>

      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>
          완료된 작업 {done}개 · 진행률 {percent}%
        </span>
        {total === 0 && (
          <span className="text-[11px] text-gray-400">
            첫 할 일을 추가해서 오늘을 디자인해보세요 ✨
          </span>
        )}
      </div>
    </header>
  );
}
