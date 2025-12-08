import React, { useState } from "react";
import { motion } from "framer-motion";

export default function TodoBoard({ todos, setTodos }) {
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  const list = Array.isArray(todos) ? todos : [];

  // 기존 데이터 정규화
  const normalized = list.map((t) => {
    const status = t.status || (t.done ? "done" : "todo");
    const tags =
      Array.isArray(t.tags)
        ? t.tags
        : typeof t.tags === "string"
        ? t.tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

    return {
      ...t,
      title: t.title || t.text || "",
      status,
      priority: t.priority || "normal",
      favorite: t.favorite || false,
      tags,
      note: t.note || "",
    };
  });

  // 검색 / 우선순위 필터
  const filtered = normalized
    .filter((t) => {
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const haystack = [
        t.title,
        t.note || "",
        (t.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    })
    .sort((a, b) => {
      // 즐겨찾기 먼저
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      // 미완료 → 완료
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;

      return 0;
    });

  const totalCount = normalized.length;
  const doneCount = normalized.filter((t) => t.status === "done").length;

  function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();

    const newTodo = {
      id: Date.now().toString(),
      title,
      text: title,
      status: "todo",
      done: false,
      priority: "normal",
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
          ? {
              ...t,
              status: t.status === "done" ? "todo" : "done",
              done: t.status !== "done",
            }
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

  function editNote(id) {
    const current = normalized.find((t) => t.id === id);
    const next = window.prompt(
      "이 할 일에 대한 메모를 입력하세요:",
      current?.note || ""
    );
    if (next === null) return;
    setTodos((prev) =>
      (Array.isArray(prev) ? prev : []).map((t) =>
        t.id === id ? { ...t, note: next } : t
      )
    );
  }

  function editTags(id) {
    const current = normalized.find((t) => t.id === id);
    const prevTags = (current?.tags || []).join(", ");
    const next = window.prompt(
      "태그를 쉼표로 구분해서 입력하세요:",
      prevTags
    );
    if (next === null) return;
    const tags = next
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    setTodos((prev) =>
      (Array.isArray(prev) ? prev : []).map((t) =>
        t.id === id ? { ...t, tags } : t
      )
    );
  }

  function priorityBadge(priority) {
    const base =
      "px-2 py-0.5 rounded-full text-[10px] border inline-flex items-center gap-1";
    if (priority === "high") {
      return (
        <span className={`${base} bg-rose-50 border-rose-200 text-rose-500`}>
          🔥 높음
        </span>
      );
    }
    if (priority === "low") {
      return (
        <span className={`${base} bg-slate-50 border-slate-200 text-slate-500`}>
          여유
        </span>
      );
    }
    return (
      <span className={`${base} bg-sky-50 border-sky-100 text-sky-500`}>
        보통
      </span>
    );
  }

  return (
    <section className="glass p-4 flex flex-col h-full">
      {/* 상단 그라데이션 카드 */}
      <div className="rounded-3xl bg-gradient-to-br from-[#7b5cfa] via-[#38bdf8] to-[#facc15] text-white shadow-[0_20px_40px_rgba(56,189,248,0.35)] mb-3">
        <div className="px-4 pt-3 pb-3 flex flex-col gap-2">
          {/* 상단 바 */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                ☰
              </span>
              <span className="opacity-80">할 일 목록</span>
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <span className="hidden sm:inline">완료</span>
              <span className="font-semibold">
                {doneCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* 제목 + 간단 필터 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                오늘의 할 일
              </h2>
              <p className="text-[11px] opacity-80">
                중요한 것부터 하나씩만 끝내보자.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {/* 검색바 */}
              <div className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 backdrop-blur">
                <span className="text-xs opacity-80">🔍</span>
                <input
                  className="bg-transparent border-none outline-none text-[11px] placeholder:text-white/60 w-28 sm:w-36"
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* 우선순위 필터 */}
              <div className="flex items-center gap-1 text-[10px]">
                {["all", "high", "normal", "low"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={
                      "px-2 py-0.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm " +
                      (filterPriority === p
                        ? "text-[10px] font-semibold"
                        : "text-[10px] opacity-70")
                    }
                  >
                    {p === "all" && "전체"}
                    {p === "high" && "🔥"}
                    {p === "normal" && "보통"}
                    {p === "low" && "여유"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 입력 바 */}
          <div className="mt-1 mb-1">
            <div className="flex items-center rounded-2xl bg-white/15 border border-white/25 px-3 py-2 backdrop-blur-md">
              <button
                onClick={addTodo}
                className="mr-2 w-6 h-6 rounded-full bg-white/70 text-[#7b5cfa] flex items-center justify-center text-sm font-bold shadow-sm"
              >
                +
              </button>
              <input
                className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-white/60 text-white"
                placeholder="할 일을 입력하고 Enter (예: 스마트스토어 엑셀 포맷 수정)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 리스트 영역 */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            등록된 할 일이 없어요. 위에서 새로 추가해보세요 ✨
          </div>
        ) : (
          filtered.map((t) => (
            <motion.div
              key={t.id}
              whileHover={{ scale: 1.01, y: -1 }}
              className="bg-white rounded-2xl px-3 py-2 shadow-[0_10px_25px_rgba(15,23,42,0.06)] border border-slate-100 flex items-center gap-2"
            >
              {/* 체크 버튼 */}
              <button
                onClick={() => toggleDone(t.id)}
                className={
                  "flex items-center justify-center w-5 h-5 rounded-full border text-[11px] mr-1 " +
                  (t.status === "done"
                    ? "bg-gradient-to-br from-[#7b5cfa] to-[#38bdf8] text-white border-transparent"
                    : "border-slate-300 text-slate-400 bg-white")
                }
              >
                {t.status === "done" && "✓"}
              </button>

              {/* 텍스트 + 메타 */}
              <div className="flex-1 min-w-0">
                <p
                  className={
                    "text-xs font-medium truncate " +
                    (t.status === "done"
                      ? "line-through text-slate-400"
                      : "text-slate-800")
                  }
                >
                  {t.title}
                </p>

                {/* 메모 / 태그 */}
                {(t.note || (t.tags && t.tags.length > 0)) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {t.note && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {t.note}
                      </span>
                    )}
                    {(t.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                    {priorityBadge(t.priority)}
                  </div>
                )}
              </div>

              {/* 우측 아이콘들 */}
              <div className="flex flex-col items-end gap-1 ml-1">
                <button
                  onClick={() => toggleFavorite(t.id)}
                  className="text-lg leading-none"
                  title="즐겨찾기"
                >
                  {t.favorite ? "⭐" : "☆"}
                </button>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <button
                    onClick={() => editNote(t.id)}
                    className="px-1.5 py-0.5 rounded-full border border-slate-200 hover:bg-slate-50"
                  >
                    메모
                  </button>
                  <button
                    onClick={() => editTags(t.id)}
                    className="px-1.5 py-0.5 rounded-full border border-slate-200 hover:bg-slate-50"
                  >
                    태그
                  </button>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="px-1.5 py-0.5 rounded-full border border-rose-200 text-rose-400 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
