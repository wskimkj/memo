import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

const PASTEL_NOTE_COLORS = [
  "#FEF3C7", // 노랑
  "#E0F2FE", // 하늘
  "#EDE9FE", // 연보라
  "#DCFCE7", // 민트
  "#FCE7F3", // 핑크
  "#FFEDD5", // 살구
  "#F5F5F4", // 그레이
];

// 그룹 탭 색 (원노트 느낌)
const GROUP_TAB_COLORS = [
  "#BFDBFE", // 연파랑
  "#FBCFE8", // 연핑크
  "#FDE68A", // 연노랑
  "#C7D2FE", // 연보라
  "#BBF7D0", // 연민트
];

// 그룹 이름으로 항상 같은 색 나오게
function getGroupColor(name) {
  if (!name) return GROUP_TAB_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return GROUP_TAB_COLORS[sum % GROUP_TAB_COLORS.length];
}

export default function MemoBoard({
  memos,
  setMemos,
  activeGroup,
  setActiveGroup,
  groupsOrder,
  setGroupsOrder,
}) {
  const [newGroup, setNewGroup] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  const [draftHtml, setDraftHtml] = useState("");
  const [clipboardMemo, setClipboardMemo] = useState(null);

  const [editingGroup, setEditingGroup] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");

  // 메모 → 그룹 드래그 이동 상태
  const [draggingMemoId, setDraggingMemoId] = useState(null);
  const [memoDragOverGroup, setMemoDragOverGroup] = useState(null);

  // 색상 선택 팝업 (메모별)
  const [colorPickerFor, setColorPickerFor] = useState(null);

  const draftEditorRef = useRef(null);

  // 실제 그룹 목록 = 저장된 순서 + memos 키들의 합집합
  const allMemoGroups = Object.keys(memos || {});
  const groups = Array.from(
    new Set([...(groupsOrder || []), ...allMemoGroups])
  );

  // 파스텔 컬러 하나 뽑기
  function getRandomColor() {
    const idx = Math.floor(Math.random() * PASTEL_NOTE_COLORS.length);
    return PASTEL_NOTE_COLORS[idx];
  }

  // 그룹 만들기
  function createGroup() {
    const g = newGroup.trim();
    if (!g) return;
    setMemos((prev) => ({ ...prev, [g]: prev[g] || [] }));
    setGroupsOrder((prev) => {
      const base = prev && prev.length ? prev : groups;
      if (base.includes(g)) return base;
      return [...base, g];
    });
    setActiveGroup(g);
    setNewGroup("");
    setShowNewGroupInput(false);
  }

  // 그룹 삭제
  function deleteGroup(name) {
    if (!name) return;
    const otherGroups = groups.filter((g) => g !== name);
    if (otherGroups.length === 0) {
      window.alert("마지막 남은 그룹은 삭제할 수 없어요.");
      return;
    }

    const memoCount = (memos[name] || []).length;
    const targetGroup = otherGroups[0];

    if (memoCount > 0) {
      const ok = window.confirm(
        `그룹 "${name}" 안에 메모 ${memoCount}개가 있습니다.\n` +
          `삭제하면 이 메모들은 "${targetGroup}" 그룹으로 이동해둘게요.\n계속 진행할까요?`
      );
      if (!ok) return;
    }

    setMemos((prev) => {
      const copy = { ...prev };
      const moving = copy[name] || [];
      delete copy[name];
      if (moving.length > 0) {
        copy[targetGroup] = [...moving, ...(copy[targetGroup] || [])];
      }
      return copy;
    });

    setGroupsOrder((prev) => (prev || []).filter((g) => g !== name));

    if (activeGroup === name) {
      setActiveGroup(targetGroup);
    }
  }

  // 그룹 이름 편집
  function startEditGroup(name) {
    setEditingGroup(name);
    setEditingGroupValue(name);
  }

  function submitEditGroup() {
    const oldName = editingGroup;
    const newName = editingGroupValue.trim();
    if (!oldName) return;
    if (!newName || newName === oldName) {
      setEditingGroup(null);
      setEditingGroupValue("");
      return;
    }

    setMemos((prev) => {
      const copy = { ...prev };
      const oldList = copy[oldName] || [];
      delete copy[oldName];

      if (copy[newName]) {
        copy[newName] = [...oldList, ...copy[newName]];
      } else {
        copy[newName] = oldList;
      }
      return copy;
    });

    setGroupsOrder((prev) =>
      (prev || []).map((g) => (g === oldName ? newName : g))
    );

    if (activeGroup === oldName) {
      setActiveGroup(newName);
    }

    setEditingGroup(null);
    setEditingGroupValue("");
  }

  // 메모 삭제
  function removeMemo(id) {
    if (!activeGroup) return;
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).filter((m) => m.id !== id);
      return copy;
    });
  }

  // 메모 본문 HTML 업데이트
  function updateMemoHtml(id, html) {
    const plain = stripHtml(html);
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, html, text: plain } : m
      );
      return copy;
    });
  }

  // 메모 제목 업데이트
  function updateMemoTitle(id, title) {
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, title } : m
      );
      return copy;
    });
  }

  // 메모 색상 변경
  function updateMemoColor(id, color) {
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, color } : m
      );
      return copy;
    });
  }

  // 메모를 다른 그룹으로 이동 (드래그 & 드롭)
  function moveMemoToGroup(id, targetGroup) {
    if (!targetGroup || targetGroup === activeGroup) return;
    setMemos((prev) => {
      const copy = { ...prev };
      const fromList = copy[activeGroup] || [];
      const idx = fromList.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const [memo] = fromList.splice(idx, 1);
      copy[activeGroup] = fromList;
      if (!copy[targetGroup]) copy[targetGroup] = [];
      copy[targetGroup] = [memo, ...(copy[targetGroup] || [])];
      return copy;
    });
  }

  // 메모 복사 / 잘라내기
  function copyMemo(memo) {
    setClipboardMemo({
      mode: "copy",
      fromGroup: activeGroup,
      memo: { ...memo, id: undefined },
    });
  }

  function cutMemo(memo) {
    setClipboardMemo({
      mode: "cut",
      fromGroup: activeGroup,
      memo: { ...memo, id: undefined },
    });
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).filter(
        (m) => m.id !== memo.id
      );
      return copy;
    });
  }

  function pasteClipboardToActiveGroup() {
    if (!clipboardMemo) return;
    const targetGroup = activeGroup || groups[0] || "기본";
    const base = clipboardMemo.memo;
    if (!base) return;
    const newId = Date.now().toString();
    const plain = stripHtml(base.html || base.text || "");
    const nextMemo = {
      id: newId,
      title: base.title || plain.slice(0, 30),
      text: plain,
      html: base.html,
      createdAt: new Date().toISOString(),
      color: base.color || getRandomColor(),
    };
    setMemos((prev) => {
      const copy = { ...prev };
      if (!copy[targetGroup]) copy[targetGroup] = [];
      copy[targetGroup] = [nextMemo, ...(copy[targetGroup] || [])];
      return copy;
    });
    if (clipboardMemo.mode === "cut") {
      setClipboardMemo(null);
    }
  }

  // 새 메모 추가
  function addMemo() {
    const html = (draftHtml || "").trim();
    const plain = stripHtml(html);
    if (!plain) return;
    const group = activeGroup || groups[0] || "기본";
    const firstLine = plain.split("\n")[0] || "";
    const nextMemo = {
      id: Date.now().toString(),
      title: firstLine.slice(0, 30), // 기본 제목
      text: plain,
      html,
      createdAt: new Date().toISOString(),
      color: getRandomColor(),
    };
    setMemos((prev) => {
      const copy = { ...prev };
      if (!copy[group]) copy[group] = [];
      copy[group] = [nextMemo, ...(copy[group] || [])];
      return copy;
    });
    setDraftHtml("");
    if (draftEditorRef.current) {
      draftEditorRef.current.innerHTML = "";
    }
  }

  function clearDraft() {
    setDraftHtml("");
    if (draftEditorRef.current) {
      draftEditorRef.current.innerHTML = "";
    }
  }

  // 리치 텍스트 툴바 액션
  function applyFormat(command, value) {
    document.execCommand(command, false, value ?? null);
  }

  function handleInsertLink() {
    const url = window.prompt("링크 URL을 입력하세요");
    if (url) {
      applyFormat("createLink", url);
    }
  }

  function handleInsertImage() {
    const url = window.prompt("이미지 URL을 입력하세요");
    if (url) {
      applyFormat("insertImage", url);
    }
  }

  const currentMemos = memos[activeGroup] || [];

  return (
    <aside className="glass p-5 flex flex-col h-full">
      {/* 상단 타이틀 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">메모 보드</h2>
          <p className="text-[14px] text-gray-400">
          </p>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          <div>
            현재 그룹:{" "}
            <span className="font-medium text-gray-700">{activeGroup}</span>
          </div>
          <div>메모 {currentMemos.length}개</div>
        </div>
      </div>

      {/* 클립보드 상태 */}
      {clipboardMemo && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-dashed border-amber-300/80 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800">
          <span>
            "{clipboardMemo.memo?.title || clipboardMemo.memo?.text?.slice(0, 20) || "메모"}
            " 를 {clipboardMemo.mode === "cut" ? "잘라냈어요" : "복사했어요"}.
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={pasteClipboardToActiveGroup}
              className="px-2 py-1 rounded-full border border-amber-300 bg-white/70 hover:bg-white text-[11px] font-medium"
            >
          
            </button>
            <button
              onClick={() => setClipboardMemo(null)}
              className="px-2 py-1 rounded-full text-[11px] text-amber-500 hover:bg-amber-100/60"
            >
              지우기
            </button>
          </div>
        </div>
      )}

      {/* 상단: 그룹 탭 바 (원노트 스타일) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">
          </span>
          <span className="text-[10px] text-gray-400">
          </span>
        </div>

        <div className="relative">
          {/* 탭 아래 하얀 바 */}
          <div className="h-7 bg-white/90 rounded-t-md border border-gray-200 border-b-0" />

          {/* 탭들 */}
          <div className="absolute left-2 top-0 flex items-end gap-1 pr-14">
            {groups.map((g) => {
              const active = g === activeGroup;
              const color = getGroupColor(g);
              return (
                <div
                  key={g}
                  className={
                    "group relative flex items-center " +
                    (memoDragOverGroup === g ? "drop-shadow-md" : "")
                  }
                  onDragOver={(e) => {
                    if (draggingMemoId) {
                      e.preventDefault();
                      setMemoDragOverGroup(g);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingMemoId) {
                      moveMemoToGroup(draggingMemoId, g);
                      setDraggingMemoId(null);
                      setMemoDragOverGroup(null);
                    }
                  }}
                  onDragLeave={() => {
                    if (memoDragOverGroup === g) setMemoDragOverGroup(null);
                  }}
                >
                  {editingGroup === g ? (
                    <input
                      autoFocus
                      value={editingGroupValue}
                      onChange={(e) => setEditingGroupValue(e.target.value)}
                      onBlur={submitEditGroup}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitEditGroup();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingGroup(null);
                          setEditingGroupValue("");
                        }
                      }}
                      className="px-3 py-1 text-xs rounded-t-md border border-gray-300 bg-white/95 outline-none"
                      style={{ marginBottom: 1 }}
                    />
                  ) : (
                    <button
                      onClick={() => setActiveGroup(g)}
                      className={
                        "px-3 py-1 text-xs rounded-t-md border border-gray-300 border-b-0 shadow-sm transition-all " +
                        (active
                          ? "font-semibold text-gray-900"
                          : "text-gray-600 hover:-translate-y-[1px]")
                      }
                      style={{
                        backgroundColor: color,
                        marginBottom: active ? 0 : 1,
                      }}
                    >
                      {g}
                    </button>
                  )}

                  {/* 탭 우측 작은 아이콘들 */}
                  {active && editingGroup !== g && (
                    <div className="absolute -right-4 bottom-[3px] flex flex-col gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditGroup(g)}
                        className="text-[10px] text-gray-500 hover:text-indigo-500"
                        title="이름 수정"
                      >
                        ✏️
                      </button>
                      {groups.length > 1 && (
                        <button
                          onClick={() => deleteGroup(g)}
                          className="text-[10px] text-gray-400 hover:text-red-500"
                          title="삭제"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* + 탭 */}
            <button
              onClick={() => setShowNewGroupInput((v) => !v)}
              className="ml-1 px-3 py-1 text-xs rounded-t-md border border-dashed border-gray-300 border-b-0 bg-gray-50 hover:bg-white hover:-translate-y-[1px] transition-all"
            >
              +
            </button>
          </div>

          {/* 새 그룹 입력창 */}
          {showNewGroupInput && (
            <div className="mt-8 flex items-center gap-2 px-2">
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="새 그룹 이름"
                className="px-2 py-1 text-xs rounded-md border border-gray-300 flex-1 bg-white/90 outline-none focus:ring-1 focus:ring-indigo-300"
              />
              <button
                onClick={createGroup}
                className="px-2 py-1 text-xs rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
              >
                추가
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 상단: 새 메모 입력 카드 */}
      <div className="mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#fef3c7]/80 via-white/95 to-white/95 border border-amber-100/80 shadow-[0_18px_40px_rgba(251,191,36,0.18)]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(250,250,249,1)]" />
              <span className="text-xs font-medium text-amber-900">
                새 메모
              </span>
            </div>
            <button
              onClick={clearDraft}
              className="text-[11px] text-amber-500 hover:text-amber-700"
            >
              비우기
            </button>
          </div>

          {/* 서식 툴바 */}
          <div className="flex items-center gap-1 px-4 pb-2 border-t border-b border-amber-100/80 text-[11px] text-amber-800/80">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("bold")}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80 font-semibold"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("italic")}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80 italic"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("underline")}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80 underline"
            >
              U
            </button>
            <span className="mx-1 h-4 w-px bg-amber-200/80" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("insertUnorderedList")}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80"
            >
              • 목록
            </button>
            <span className="mx-1 h-4 w-px bg-amber-200/80" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertLink}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80"
            >
              링크
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertImage}
              className="px-2 py-1 rounded-md hover:bg-amber-100/80"
            >
              이미지
            </button>
            <span className="ml-auto text-[10px] text-amber-500">
              현재 그룹: {activeGroup}
            </span>
          </div>

          {/* 에디터 본문 */}
          <div
            ref={draftEditorRef}
            className="min-h-[110px] max-h-64 overflow-y-auto px-4 pb-3 pt-2 text-sm leading-relaxed text-gray-800 outline-none"
            contentEditable
            data-placeholder="자유롭게 적어보세요."
            onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
          />

          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[11px] text-amber-500">
            </span>
            <button
              onClick={addMemo}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-md hover:shadow-lg transition-shadow"
              style={{
                background: "linear-gradient(90deg,#f97316,#fbbf24)",
              }}
            >
              메모 추가
            </button>
          </div>
        </div>
      </div>

      {/* 메모 리스트 - 파스텔 스티커 메모 + 제목 필드 */}
      <div className="flex-1 flex flex-col">
        {currentMemos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-4">
        
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {currentMemos.map((m) => {
              const contentHtml =
                m.html || (m.text ? m.text.replace(/\n/g, "<br />") : "");
              const color = m.color || getRandomColor();

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className="relative rounded-xl shadow-md border border-black/5 overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{
                    backgroundColor: color,
                  }}
                  draggable
                  onDragStart={() => setDraggingMemoId(m.id)}
                  onDragEnd={() => {
                    setDraggingMemoId(null);
                    setMemoDragOverGroup(null);
                  }}
                >
                  {/* 상단 테이프 느낌 */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-b-full bg-white/70 shadow" />

                  {/* 카드 상단: 제목 + 액션 */}
                  <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        value={m.title || ""}
                        onChange={(e) =>
                          updateMemoTitle(m.id, e.target.value)
                        }
                        placeholder="제목"
                        className="w-full text-xs font-semibold text-gray-900 bg-transparent border-b border-white/60 focus:outline-none focus:border-gray-700 pb-0.5 placeholder:text-gray-400"
                      />
                    </div>

                    <div className="flex gap-1 absolute top-1 right-1">

  {/* 🎨 색상 선택 */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setColorPickerFor((prev) => (prev === m.id ? null : m.id));
    }}
    className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white text-[12px]"
    title="색상 변경"
  >
    🎨
  </button>

  {/* 📄 복사 */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      copyMemo(m);
    }}
    className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white"
    title="복사"
  >
    📄
  </button>

  {/* × 잘라내기 */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      cutMemo(m);
    }}
    className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white"
    title="잘라내기"
  >
    ×
  </button>

</div>


                      {/* 색상 선택 팝업 */}
                      {colorPickerFor === m.id && (
                        <div className="absolute top-7 right-0 z-20 rounded-xl bg-white shadow-lg border border-gray-200 px-2 py-2 flex flex-wrap gap-1 w-32">
                          {PASTEL_NOTE_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                updateMemoColor(m.id, c);
                                setColorPickerFor(null);
                              }}
                              className={
                                "w-5 h-5 rounded-full border border-black/10 focus:outline-none" +
                                (c === color ? " ring-2 ring-indigo-300" : "")
                              }
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
               
                  {/* 본문 영역 */}
                  <div className="px-3 pb-2">
                    <div
                      className="text-[9px] whitespace-pre-wrap leading-relaxed focus:outline-none rounded-md px-2 py-2 max-h-40 overflow-y-auto bg-white/30"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        updateMemoHtml(m.id, e.currentTarget.innerHTML)
                      }
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </div>

                  {/* 하단 메타 (작성시간만) */}
                  <div className="px-3 pb-3 flex items-center justify-between gap-2 text-[11px] text-gray-600">
                    {m.createdAt && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(m.createdAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        작성
                      </span>
                    )}
                  
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// 간단한 HTML -> 텍스트 변환
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}
