import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function todayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "날짜 없음";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  const base = d.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short"
  });
  const isToday = dateStr === todayString();
  return isToday ? `${base} · 오늘` : base;
}

export default function TodoBoard({ todos, setTodos }) {
  const inputRef = useRef();
  const [newDate, setNewDate] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | done
  const [viewDate, setViewDate] = useState(todayString()); // 이 날짜 + 날짜 없는 것만 노출

  function addTodo(text) {
    const t = (text || inputRef.current.value || "").trim();
    if (!t) return;
    setTodos((prev) => [
      {
        id: Date.now().toString(),
        text: t,
        done: false,
        date: newDate || null
      },
      ...prev
    ]);
    if (inputRef.current) inputRef.current.value = "";
    setNewDate("");
  }

  function toggle(id) {
    setTodos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p))
    );
  }

  function remove(id) {
    setTodos((prev) => prev.filter((p) => p.id !== id));
  }

  function move(id, dir) {
    setTodos((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const [item] = arr.splice(idx, 1);
      const newIdx = Math.max(0, Math.min(arr.length, idx + dir));
      arr.splice(newIdx, 0, item);
      return arr;
    });
  }

  function clearDone() {
    setTodos((prev) => prev.filter((t) => !t.done));
  }

  function editTodo(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const next = window.prompt("내용 수정", target.text);
    if (next == null) return;
    const text = next.trim();
    if (!text) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    );
  }

  function editDate(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const base = target.date || viewDate || todayString();
    const next = window.prompt(
      "날짜를 YYYY-MM-DD 형식으로 입력하세요 (비우면 취소)",
      base
    );
    if (next == null) return;
    const value = next.trim();
    if (!value) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, date: value } : t))
    );
  }

  function clearDate(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, date: null } : t))
    );
  }

  // 보기 날짜 + 날짜 없는 todo만 우선 필터
  const baseTodos = todos.filter(
    (t) => !t.date || t.date === viewDate
  );

  const activeCount = baseTodos.filter((t) => !t.done).length;
  const doneCount = baseTodos.length - activeCount;

  const filtered = baseTodos.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  return (
    <section className="glass p-5 space-y-4">
      {/* 상단: 입력 영역 */}
      <div className="flex flex-col gap-2 mb-1">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            className="input flex-1 text-sm"
            placeholder="새 할 일 추가 (Enter 또는 추가 버튼)"
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
            }}
          />
          <button
            onClick={() => addTodo()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow"
            style={{
              background: "linear-gradient(120deg,#7b5cfa,#a084ff)"
            }}
          >
            추가
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">날짜 (선택)</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input !py-1 !px-2 text-xs w-40"
            />
          </div>
          <span className="text-[11px]">
            날짜를 지정하면 해당 날짜에만, 지정하지 않으면 항상 표시됩니다.
          </span>
        </div>
      </div>

      {/* 보기 날짜 + 필터 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">보기 날짜</span>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value || todayString())}
              className="input !py-1 !px-2 text-xs w-40"
            />
            <button
              onClick={() => setViewDate(todayString())}
              className="text-[11px] px-2 py-1 rounded-full bg-white/80 border border-gray-200 hover:bg-gray-50"
            >
              오늘로 이동
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              이 날짜 기준 · 진행중 {activeCount} · 완료 {doneCount}
            </span>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="text-[11px] text-red-500 underline underline-offset-2"
              >
                완료 모두 삭제
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: "all", label: "전체" },
              { id: "active", label: "진행중" },
              { id: "done", label: "완료" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={
                  "px-3 py-1 rounded-full border text-xs transition-colors " +
                  (filter === f.id
                    ? "bg-gradient-to-r from-[#7b5cfa] to-[#a084ff] text-white border-transparent shadow-sm"
                    : "bg:white/80 border-gray-200 text-gray-700 hover:bg-white")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/90 border border-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => toggle(t.id)}
                  className={
                    "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] " +
                    (t.done
                      ? "bg-gradient-to-r from-[#7b5cfa] to-[#a084ff] border-transparent text-white"
                      : "border-gray-300 bg-white text-transparent")
                  }
                >
                  ✓
                </button>
                <div
                  className={
                    "flex-1 text-sm cursor-pointer " +
                    (t.done ? "line-through text-gray-400" : "text-gray-800")
                  }
                  onClick={() => toggle(t.id)}
                  onDoubleClick={() => editTodo(t.id)}
                  title="클릭: 완료 체크 / 더블클릭: 내용 수정"
                >
                  {t.text}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* 날짜 배지 */}
                <div className="flex items-center gap-1">
                  {t.date ? (
                    <button
                      onClick={() => editDate(t.id)}
                      className="px-2 py-1 rounded-full bg-purple-50 text-[11px] text-purple-700 border border-purple-100 hover:bg-purple-100"
                      title="클릭해서 날짜 수정"
                    >
                      {formatDateLabel(t.date)}
                    </button>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-gray-50 text-[11px] text-gray-400 border border-gray-100">
                      항상 노출
                    </span>
                  )}
                  {t.date && (
                    <button
                      onClick={() => clearDate(t.id)}
                      className="text-[11px] text-gray-400 hover:text-red-400"
                      title="날짜 제거"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                  <button
                    onClick={() => move(t.id, -1)}
                    className="px-1 hover:text-gray-700"
                    title="위로"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(t.id, +1)}
                    className="px-1 hover:text-gray-700"
                    title="아래로"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="px-1 text-red-500 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">
            이 날짜와 필터에 해당하는 할 일이 없어요.
          </div>
        )}
      </div>
    </section>
  );
}
