import React, { useMemo } from "react";
import { motion } from "framer-motion";

export default function Header({ remaining, total }) {
  const done = total - remaining;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const dateLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }, []);

  return (
    <header className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-white/70 border border-white/60 shadow-sm">
            {dateLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>
            할 일{" "}
            <span className="font-semibold text-violet-600">{remaining}</span> / 전체{" "}
            {total}
          </span>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="badge"
          >
            {remaining}
          </motion.div>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-white/60 border border-white/70 overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="h-full"
          style={{ background: "linear-gradient(90deg,#7b5cfa,#a084ff)" }}
        />
      </div>

      <div className="text-[11px] text-gray-500 flex items-center justify-between">
        <span>
          완료: {done}개 · {percent}% 달성
        </span>
        {total === 0 && <span className="text-[11px] text-gray-400"></span>}
      </div>
    </header>
  );
}
