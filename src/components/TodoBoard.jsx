import React, { useMemo, useState } from "react";

export default function TodoCard() {
  const [items, setItems] = useState([
    { id: 1, text: "편집", done: true, starred: false },
    { id: 2, text: "예시: 환영합니다!", done: true, starred: false },
  ]);
  const [value, setValue] = useState("");

  const doneCount = useMemo(() => items.filter(i => i.done).length, [items]);
  const totalCount = items.length;

  const addItem = () => {
    const t = value.trim();
    if (!t) return;
    setItems(prev => [{ id: Date.now(), text: t, done: false, starred: false }, ...prev]);
    setValue("");
  };

  const toggleDone = (id) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, done: !i.done } : i)));

  const toggleStar = (id) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, starred: !i.starred } : i)));

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-10">
      {/* soft outer glow */}
      <div className="relative">
        <div className="absolute -inset-10 rounded-[40px] bg-gradient-to-br from-indigo-200/60 via-purple-200/50 to-pink-200/60 blur-2xl" />
        <div className="relative w-[360px] rounded-[36px] bg-white/60 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.18)] ring-1 ring-white/60 p-7">
          {/* inner card */}
          <div className="rounded-[28px] bg-gradient-to-br from-indigo-200/55 via-purple-200/55 to-pink-200/55 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ring-1 ring-white/50 p-6">
            {/* top bar */}
            <div className="flex items-center justify-between text-white/90">
              <button className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/25 ring-1 ring-white/25 grid place-items-center transition">
                <span className="block w-4 h-0.5 bg-white/90 rounded" />
                <span className="block w-4 h-0.5 bg-white/90 rounded mt-1" />
                <span className="block w-4 h-0.5 bg-white/90 rounded mt-1" />
              </button>

              <div className="text-sm font-semibold tracking-wide drop-shadow-sm">
                To Do List
              </div>

              <button className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/25 ring-1 ring-white/25 grid place-items-center transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 21l-4.3-4.3m1.3-5.2a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* title + page */}
            <div className="mt-5 flex items-center justify-between">
              <div className="text-white font-extrabold text-xl drop-shadow-sm">
                오늘 할 일
              </div>

              <div className="px-3 py-1 rounded-full bg-white/20 ring-1 ring-white/25 text-white/90 text-xs font-semibold">
                {Math.min(doneCount, 2)}/{Math.max(2, totalCount || 2)}
              </div>
            </div>

            {/* input pill */}
            <div className="mt-4 flex items-center gap-3 rounded-full bg-white/20 ring-1 ring-white/30 px-4 py-3">
              <button
                onClick={addItem}
                className="h-9 w-9 rounded-full bg-white/30 hover:bg-white/35 ring-1 ring-white/35 grid place-items-center transition"
                aria-label="add"
              >
                <span className="text-white text-xl leading-none">+</span>
              </button>

              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Add a task..."
                className="flex-1 bg-transparent placeholder:text-white/70 text-white outline-none text-sm"
              />
            </div>

            {/* list */}
            <div className="mt-5 space-y-3">
              {items.slice(0, 2).map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/70 ring-1 ring-white/70 px-4 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.08)]"
                >
                  <button
                    onClick={() => toggleDone(it.id)}
                    className="h-9 w-9 rounded-full bg-indigo-500/90 hover:bg-indigo-500 text-white grid place-items-center shadow-[0_10px_18px_rgba(99,102,241,0.35)] transition"
                    aria-label="toggle done"
                  >
                    {it.done ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div
                      className={[
                        "text-sm font-semibold text-slate-700 truncate",
                        it.done ? "line-through opacity-70" : "",
                      ].join(" ")}
                    >
                      {it.text}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStar(it.id)}
                    className="h-9 w-9 rounded-full hover:bg-slate-100/70 grid place-items-center transition"
                    aria-label="star"
                    title="star"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={it.starred ? "#111827" : "none"}>
                      <path
                        d="M12 17.3l-6.2 3.6 1.6-7.1L1.9 9l7.3-.6L12 1.8l2.8 6.6 7.3.6-5.5 4.8 1.6 7.1z"
                        stroke="#111827"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => remove(it.id)}
                    className="h-9 w-9 rounded-full hover:bg-slate-100/70 grid place-items-center transition"
                    aria-label="remove"
                    title="remove"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="#111827"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* subtle bottom tint like your mock */}
            <div className="mt-4 h-10 rounded-2xl bg-gradient-to-r from-pink-200/60 to-purple-200/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
