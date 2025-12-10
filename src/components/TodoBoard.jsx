import React, { useState } from "react";
import { motion } from "framer-motion";

export default function TodoBoard({ todos, setTodos }) {
  const [newTitle, setNewTitle] = useState("");

  // 기존 데이터 정규화 (text, done 형태도 지원)
  const list = (Array.isArray(todos) ? todos : []).map((t) => ({
    ...t,
    id: t.id ?? String(t.createdAt ?? Date.now()),
    title: t.title || t.text || "",
    done: t.done ?? (t.status === "done"),
    favorite: t.favorite ?? false,
  }));

  const totalCount = list.length;
  const doneCount = list.filter((t) => t.done).length;

  const sorted = [...list].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    return 0;
  });

  function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();

    const newTodo = {
      id: Date.now().toString(),
      title,
      text: title,
      done: false,
      status: "todo",
      favorite: false,
      createdAt: now,
    };

    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [newTodo, ...base];
    });
    setNewTitle("");
  }

  function toggleDone(id) {
    setTodos((prev) =>
      (Array.isArray(prev) ? prev : []).map((t) =>
        t.id === id
          ? { ...t, done: !t.done, status: !t.done ? "done" : "todo" }
          : t
      )
    );
  }

  function toggleFavorite(id) {
    setTodos((prev) =>
      (Array.isArray(prev) ? prev : []).map((t) =>
        t.id === id ? { ...t, favorite: !t.favorite } : t
      )
    );
  }

  function deleteTodo(id) {
    setTodos((prev) =>
      (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id)
    );
  }

  return (
    <section className="glass p-4 h-full flex flex-col">
      {/* 전체 카드: 오른쪽 영역 높이를 꽉 채우도록 h-full */}
      <div className="w-full h-full rounded-[32px] bg-gradient-to-b from-[#d9d3ff] via-[#f8ddff] to-[#ffc7da] shadow-[0_24px_50px_rgba(148,163,184,0.45)] overflow-hidden flex flex-col">
        {/* 상단 헤더 : 패딩/폰트 줄여서 컴팩트하게 */}
        <div className="px-4 pt-2 pb-2 text-white border-b border-white/15">
          {/* 작은 탑바 */}
          <div className="flex items-center justify-between text-[10px] mb-2">
            <button className="w-5 h-5 rounded-full bg-white/18 flex items-center justify-center">
              ☰
            </button>
            <span className="opacity-80">To Do List</span>
            <button className="w-5 h-5 rounded-full bg-white/18 flex items-center justify-center">
              🔍
            </button>
          </div>

          {/* 제목 + 진행률 (아주 작게) */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                오늘 할 일
              </h2>
              <p className="text-[10px] opacity-75">
                
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px]">
                 {doneCount} /  {totalCount}
              </span>
            </div>
          </div>

          {/* 입력 바 (높이만 딱 맞게) */}
          <div className="mt-2">
            <div className="flex items-center rounded-2xl bg-white/12 border border-white/30 px-3 py-1.5 backdrop-blur-md">
              <button
                onClick={addTodo}
                className="mr-2 w-5 h-5 rounded-full bg-white/70 text-[#7b5cfa] flex items-center justify-center text-xs font-bold shadow-sm"
              >
                +
              </button>
              <input
                className="flex-1 bg-transparent border-none outline-none text-[11px] placeholder:text-white/60 text-white"
                placeholder="Add a task…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                }}
              />
            </div>
          </div>
        </div>

        {/* 리스트 영역 : flex-1 + 스크롤 → 세로 꽉 채우고 목록 길게 */}
        <div className="flex-1 px-3 pb-3 pt-2 overflow-y-auto space-y-2">
          {sorted.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[11px] text-white/80">
            
            </div>
          ) : (
            sorted.map((t) => (
              <motion.div
                key={t.id}
                whileHover={{ scale: 1.01, y: -2 }}
                className="bg-white/95 rounded-2xl shadow-[0_14px_30px_rgba(148,163,184,0.35)] px-3 py-2 flex items-center"
              >
                {/* 체크 동그라미 */}
                <button
                  onClick={() => toggleDone(t.id)}
                  className={
                    "w-6 h-6 mr-2 rounded-full border flex items-center justify-center text-[12px] " +
                    (t.done
                      ? "bg-[#7b5cfa] border-[#7b5cfa] text-white"
                      : "border-[#c4b8ff] text-[#7b5cfa] bg-white")
                  }
                >
                  {t.done && "✓"}
                </button>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <p
                    className={
                      "text-[12px] truncate " +
                      (t.done
                        ? "text-slate-400 line-through"
                        : "text-slate-700")
                    }
                  >
                    {t.title}
                  </p>
                </div>

                {/* 오른쪽 아이콘들 */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => toggleFavorite(t.id)}
                    className="text-[16px]"
                  >
                    {t.favorite ? "⭐" : "☆"}
                  </button>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="text-xs text-slate-300 hover:text-rose-400"
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
