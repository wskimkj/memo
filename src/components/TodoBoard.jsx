import React, { useState } from "react";
import { motion } from "framer-motion";

export default function TodoBoard({ todos, setTodos }) {
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDue, setQuickDue] = useState("");
  const [quickPriority, setQuickPriority] = useState("normal");
  const [quickTags, setQuickTags] = useState("");
  const [quickNote, setQuickNote] = useState("");

  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [todayOnly, setTodayOnly] = useState(false);

  const list = Array.isArray(todos) ? todos : [];

  // 기존 데이터 호환: title / status / tags / note 정리
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
      tags,
      note: t.note || "",
    };
  });

  // 오늘 날짜 비교용 (dueDate == 오늘)
  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  // 검색/필터 적용
  const filtered = normalized.filter((t) => {
    // 우선순위 필터
    if (
      filterPriority !== "all" &&
      (t.priority || "normal") !== filterPriority
    ) {
      return false;
    }

    // 오늘만 보기 필터
    if (todayOnly && !isToday(t.dueDate)) {
      return false;
    }

    // 검색어 필터
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const haystack = [
      t.title || "",
      t.text || "",
      t.note || "",
      ...(t.tags || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const columns = {
    todo: {
      label: "할 일",
      description: "해야 할 일들",
      items: filtered.filter((t) => t.status === "todo"),
    },
    doing: {
      label: "진행 중",
      description: "지금 손대고 있는 것들",
      items: filtered.filter((t) => t.status === "doing"),
    },
    done: {
      label: "완료",
      description: "끝낸 일들",
      items: filtered.filter((t) => t.status === "done"),
    },
  };

  function addQuickTodo() {
    const title = quickTitle.trim();
    if (!title) return;

    const now = new Date().toISOString();
    const tags =
      quickTags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean) || [];

    const newTodo = {
      id: Date.now().toString(),
      title,
      text: title,
      status: "todo",
      priority: quickPriority,
      dueDate: quickDue || null,
      createdAt: now,
      done: false,
      note: quickNote.trim() || "",
      tags,
    };

    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [newTodo, ...base];
    });

    setQuickTitle("");
    setQuickDue("");
    setQuickPriority("normal");
    setQuickTags("");
    setQuickNote("");
  }

  function toggleDone(id) {
    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((t) => {
        if (t.id !== id) return t;
        const currentStatus =
          t.status || (t.done ? "done" : "todo");
        const nextStatus =
          currentStatus === "done" ? "todo" : "done";
        return {
          ...t,
          status: nextStatus,
          done: nextStatus === "done",
          completedAt:
            nextStatus === "done" ? new Date().toISOString() : null,
        };
      });
    });
  }

  function updateStatus(id, newStatus) {
    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          status: newStatus,
          done: newStatus === "done",
          completedAt:
            newStatus === "done" ? new Date().toISOString() : null,
        };
      });
    });
  }

  function updateNote(id) {
    const current = normalized.find((t) => t.id === id);
    const prevNote = current?.note || "";
    const next = window.prompt(
      "이 Todo의 상세 메모를 입력하세요:",
      prevNote
    );
    if (next === null) return;

    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((t) =>
        t.id === id ? { ...t, note: next } : t
      );
    });
  }

  function updateTags(id) {
    const current = normalized.find((t) => t.id === id);
    const prevTags =
      current?.tags?.join(", ") ||
      (typeof current?.tags === "string"
        ? current.tags
        : "");
    const next = window.prompt(
      "태그를 쉼표로 구분해서 입력하세요:",
      prevTags
    );
    if (next === null) return;

    const tags =
      next
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean) || [];

    setTodos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((t) =>
        t.id === id ? { ...t, tags } : t
      );
    });
  }

  function handleCardDragStart(id) {
    setDraggingId(id);
  }

  function handleColumnDragOver(e, statusKey) {
    e.preventDefault();
    if (!draggingId) return;
    setDragOverStatus(statusKey);
  }

  function handleColumnDrop(e, statusKey) {
    e.preventDefault();
    if (!draggingId) {
      setDragOverStatus(null);
      return;
    }
    updateStatus(draggingId, statusKey);
    setDraggingId(null);
    setDragOverStatus(null);
  }

  function handleColumnDragLeave(e, statusKey) {
    e.preventDefault();
    if (dragOverStatus === statusKey) {
      setDragOverStatus(null);
    }
  }

  function getPriorityBadge(priority) {
    switch (priority) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 border border-red-200">
            🔥 높은 우선순위
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
            여유 있음
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 border border-blue-100">
            보통
          </span>
        );
    }
  }

  function formatDateLabel(d) {
    if (!d) return null;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <section className="glass p-5 flex flex-col h-full">
      {/* 헤더 + 검색/필터 */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Todo 보드
            </h2>
            <p className="text-[11px] text-gray-400">
              오늘 할 일, 진행 중, 완료를 한 눈에 보는 칸반 보드.
            </p>
          </div>
          <div className="text-right text-[11px] text-gray-400">
            <div>전체 {normalized.length}개</div>
            <div>
              완료{" "}
              {
                normalized.filter((t) => t.status === "done")
                  .length
              }
              개
            </div>
          </div>
        </div>

        {/* 검색 + 필터 바 */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <input
              className="flex-1 input text-xs px-3 py-2"
              placeholder="검색: 제목, 내용, 노트, 태그…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <select
              className="input text-[11px] px-2 py-1"
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(e.target.value)
              }
            >
              <option value="all">우선순위 전체</option>
              <option value="high">🔥 높음만</option>
              <option value="normal">보통만</option>
              <option value="low">여유만</option>
            </select>

            <label className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-3 h-3 accent-amber-500"
                checked={todayOnly}
                onChange={(e) =>
                  setTodayOnly(e.target.checked)
                }
              />
              <span className="text-[11px] text-slate-600">
                오늘 마감만
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 빠른 추가 영역 */}
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#e0f2fe] via-white to-[#fef9c3] border border-sky-100/80 shadow-[0_16px_32px_rgba(56,189,248,0.25)] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_0_4px_rgba(255,255,255,1)]" />
          <span className="text-xs font-medium text-sky-900">
            빠른 할 일 추가
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <input
              className="flex-1 input text-xs px-3 py-2"
              placeholder="예: 스마트스토어 엑셀 포맷 수정하기"
              value={quickTitle}
              onChange={(e) =>
                setQuickTitle(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") addQuickTodo();
              }}
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <span>마감일</span>
                <input
                  type="date"
                  className="input text-[11px] px-2 py-1"
                  value={quickDue}
                  onChange={(e) =>
                    setQuickDue(e.target.value)
                  }
                />
              </div>
              <select
                className="input text-[11px] px-2 py-1"
                value={quickPriority}
                onChange={(e) =>
                  setQuickPriority(e.target.value)
                }
              >
                <option value="high">🔥 높음</option>
                <option value="normal">보통</option>
                <option value="low">여유</option>
              </select>
              <button
                onClick={addQuickTodo}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-md hover:shadow-lg transition-shadow"
                style={{
                  background:
                    "linear-gradient(90deg,#0ea5e9,#38bdf8)",
                }}
              >
                추가
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="flex-1 input text-[11px] px-3 py-1.5"
              placeholder="태그 (쉼표로 구분, 예: 스마트스토어,엑셀,자동화)"
              value={quickTags}
              onChange={(e) =>
                setQuickTags(e.target.value)
              }
            />
            <input
              className="flex-[2] input text-[11px] px-3 py-1.5"
              placeholder="간단한 메모 (이 Todo에 대한 설명)"
              value={quickNote}
              onChange={(e) =>
                setQuickNote(e.target.value)
              }
            />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-sky-500">
          카드들은 아래 칼럼에서 드래그해서 상태를 바꿀 수 있고,
          노트·태그는 카드에서 바로 수정할 수 있어요.
        </p>
      </div>

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-[260px]">
        {Object.entries(columns).map(
          ([statusKey, col]) => (
            <div
              key={statusKey}
              className={
                "flex flex-col rounded-2xl border border-slate-100/80 bg-white/70 backdrop-blur-sm overflow-hidden shadow-[0_10px_26px_rgba(15,23,42,0.06)] " +
                (dragOverStatus === statusKey
                  ? "ring-2 ring-sky-300/80"
                  : "")
              }
              onDragOver={(e) =>
                handleColumnDragOver(e, statusKey)
              }
              onDrop={(e) =>
                handleColumnDrop(e, statusKey)
              }
              onDragLeave={(e) =>
                handleColumnDragLeave(e, statusKey)
              }
            >
              {/* 컬럼 헤더 */}
              <div className="px-3 pt-2 pb-2 border-b border-slate-100/80 flex items-center justify-between bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-800">
                      {col.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {col.items.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {col.description}
                  </p>
                </div>
                <div className="text-[18px]">
                  {statusKey === "todo" && "📝"}
                  {statusKey === "doing" && "⚙️"}
                  {statusKey === "done" && "✅"}
                </div>
              </div>

              {/* 컬럼 바디 */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.items.length === 0 ? (
                  <div className="text-[11px] text-slate-300 text-center py-4">
                    할 일이 없어요.
                  </div>
                ) : (
                  col.items.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      whileHover={{
                        scale: 1.02,
                        translateY: -1,
                      }}
                      className="group bg-white rounded-xl border border-slate-100 shadow-[0_10px_16px_rgba(15,23,42,0.06)] px-3 py-2 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() =>
                        handleCardDragStart(t.id)
                      }
                    >
                      {/* 제목 + 체크박스 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <input
                              type="checkbox"
                              className="w-3 h-3 mt-0.5 accent-sky-500"
                              checked={
                                t.status === "done" || t.done
                              }
                              onChange={() =>
                                toggleDone(t.id)
                              }
                            />
                            <p
                              className={
                                "text-xs font-medium text-slate-800 break-words " +
                                (t.status === "done" || t.done
                                  ? "line-through text-slate-400"
                                  : "")
                              }
                            >
                              {t.title || t.text}
                            </p>
                          </div>
                          {t.note && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {t.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 태그/메타 */}
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1">
                          {getPriorityBadge(
                            t.priority || "normal"
                          )}
                          {t.dueDate && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-600 border border-amber-100">
                              마감:{" "}
                              {formatDateLabel(t.dueDate)}
                              {isToday(t.dueDate) && " · 오늘"}
                            </span>
                          )}
                          {(t.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-50 text-slate-500 border border-slate-100"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* 노트/태그 수정 + 상태 버튼 */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="px-2 py-0.5 rounded-full text-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateNote(t.id)
                              }
                            >
                              📝 메모
                            </button>
                            <button
                              className="px-2 py-0.5 rounded-full text-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateTags(t.id)
                              }
                            >
                              # 태그
                            </button>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {statusKey !== "todo" && (
                              <button
                                className="px-2 py-0.5 rounded-full text-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50"
                                onClick={() =>
                                  updateStatus(t.id, "todo")
                                }
                              >
                                ↩ 할 일
                              </button>
                            )}
                            {statusKey !== "doing" && (
                              <button
                                className="px-2 py-0.5 rounded-full text-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50"
                                onClick={() =>
                                  updateStatus(t.id, "doing")
                                }
                              >
                                ⚙ 진행
                              </button>
                            )}
                            {statusKey !== "done" && (
                              <button
                                className="px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                                onClick={() =>
                                  updateStatus(t.id, "done")
                                }
                              >
                                ✅ 완료
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
