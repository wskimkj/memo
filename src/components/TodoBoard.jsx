import React, { useState } from "react";

/**
 * TodoBoard.jsx
 * - 목록: 2줄 말줄임 + 진한 텍스트
 * - 클릭 시: 모달에서 전체 텍스트 읽기/수정
 * - 기존 todos 구조: { id, text, done, date }
 */

export default function TodoBoard({ todos, setTodos }) {
  const [newText, setNewText] = useState("");
  const [openTodo, setOpenTodo] = useState(null);
  const [editText, setEditText] = useState("");

  const addTodo = () => {
    const text = newText.trim();
    if (!text) return;

    setTodos((prev) => [
      {
        id: Date.now().toString(),
        text,
        done: false,
        date: null,
      },
      ...prev,
    ]);
    setNewText("");
  };

  const toggleDone = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const saveEdit = () => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === openTodo.id ? { ...t, text: editText } : t
      )
    );
    setOpenTodo(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 추가 */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-2xl px-4 py-3 bg-white/70 border border-slate-900/10 outline-none text-slate-900 placeholder:text-slate-500"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="+ 할 일 추가 (Enter)"
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
        />
        <button
          className="rounded-2xl px-4 py-3 bg-indigo-500/15 border border-indigo-500/20 text-slate-900 font-semibold"
          onClick={addTodo}
        >
          추가
        </button>
      </div>

      {/* 목록 */}
      <div className="rounded-3xl bg-white/55 border border-slate-900/10 overflow-hidden">
        {todos.length === 0 ? (
          <div className="px-4 py-6 text-slate-500 text-sm">
            할 일이 없어요.
          </div>
        ) : (
          todos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => {
                setOpenTodo(todo);
                setEditText(todo.text);
              }}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-slate-900/5 hover:bg-slate-900/5"
            >
              {/* 체크 */}
              <span
                className="shrink-0 w-9 h-9 rounded-xl border border-slate-900/10 bg-white/70 grid place-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDone(todo.id);
                }}
              >
                {todo.done ? "✅" : "⭕"}
              </span>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-slate-900 font-semibold leading-snug line-clamp-2",
                    todo.done ? "line-through opacity-60" : "",
                  ].join(" ")}
                  title={todo.text}
                >
                  {todo.text}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ✅ 전체 보기 / 수정 모달 */}
      {openTodo && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur border border-slate-900/10 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-900/10 flex justify-between items-center">
              <div className="font-bold text-slate-900">
                할 일 보기 / 수정
              </div>
              <button
                className="rounded-xl px-3 py-2 bg-slate-900/5 border border-slate-900/10"
                onClick={() => setOpenTodo(null)}
              >
                닫기
              </button>
            </div>

            <div className="p-5">
              <textarea
                className="w-full min-h-[160px] rounded-2xl px-4 py-3 bg-white border border-slate-900/10 outline-none text-slate-900"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-2xl px-4 py-2 bg-slate-900/5 border border-slate-900/10"
                  onClick={() => setOpenTodo(null)}
                >
                  취소
                </button>
                <button
                  className="rounded-2xl px-4 py-2 bg-indigo-500/15 border border-indigo-500/20 font-semibold"
                  onClick={saveEdit}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
