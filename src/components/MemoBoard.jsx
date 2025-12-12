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

export default function MemoBoard({
  memos,
  setMemos,
  activeGroup,
  setActiveGroup,
  groupsOrder,
  setGroupsOrder,
}) {
  const [newGroup, setNewGroup] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [clipboardMemo, setClipboardMemo] = useState(null);

  const [draggingGroup, setDraggingGroup] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);

  // 그룹 이름 편집 관련 상태
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");

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
  }

  // 그룹 순서 이동 (버튼 클릭용)
  function moveGroup(name, dir) {
    setGroupsOrder((prev) => {
      const base = prev && prev.length ? [...prev] : [...groups];
      const idx = base.indexOf(name);
      if (idx < 0) return base;
      const newIdx = Math.max(0, Math.min(base.length - 1, idx + dir));
      const copy = [...base];
      const [item] = copy.splice(idx, 1);
      copy.splice(newIdx, 0, item);
      return copy;
    });
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

    // memos에서 그룹 제거 + 메모 이동
    setMemos((prev) => {
      const copy = { ...prev };
      const moving = copy[name] || [];
      delete copy[name];
      if (moving.length > 0) {
        copy[targetGroup] = [...moving, ...(copy[targetGroup] || [])];
      }
      return copy;
    });

    // 그룹 순서에서도 제거
    setGroupsOrder((prev) => (prev || []).filter((g) => g !== name));

    // 현재 활성 그룹이 삭제된 그룹이면 활성 그룹 변경
    if (activeGroup === name) {
      setActiveGroup(targetGroup);
    }
  }

  // 그룹 이름 편집 시작
  function startEditGroup(name) {
    setEditingGroup(name);
    setEditingGroupValue(name);
  }

  // 그룹 이름 편집 취소
  function cancelEditGroup() {
    setEditingGroup(null);
    setEditingGroupValue("");
  }

  // 그룹 이름 저장
  function submitEditGroup() {
    const oldName = editingGroup;
    const newName = editingGroupValue.trim();
    if (!oldName) return;
    if (!newName || newName === oldName) {
      cancelEditGroup();
      return;
    }

    setMemos((prev) => {
      const copy = { ...prev };
      const oldList = copy[oldName] || [];
      delete copy[oldName];

      if (copy[newName]) {
        // 이미 존재하는 그룹이면 메모 병합
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

  // 드래그로 그룹 순서 변경
  function handleGroupDragStart(name) {
    setDraggingGroup(name);
  }

  function handleGroupDragOver(e, targetName) {
    e.preventDefault();
    if (!draggingGroup || draggingGroup === targetName) return;
    setDragOverGroup(targetName);
  }

  function handleGroupDrop(e, targetName) {
    e.preventDefault();
    if (!draggingGroup || draggingGroup === targetName) {
      handleGroupDragEnd();
      return;
    }

    setGroupsOrder((prev) => {
      const base =
        prev && prev.length
          ? [...prev]
          : [
              ...Array.from(
                new Set([...(prev || []), ...Object.keys(memos || {})])
              ),
            ];

      const sourceIndex = base.indexOf(draggingGroup);
      const targetIndex = base.indexOf(targetName);
      if (sourceIndex === -1 || targetIndex === -1) return base;

      const updated = [...base];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });

    setDraggingGroup(null);
    setDragOverGroup(null);
  }

  function handleGroupDragEnd() {
    setDraggingGroup(null);
    setDragOverGroup(null);
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

  // 메모 텍스트 업데이트 (리치 텍스트 HTML 저장)
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

  // 메모를 다른 그룹으로 이동
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
      copy[targetGroup] = [memo, ...copy[targetGroup]];
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
    // 원본 삭제
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

  // 새 메모 추가 (상단 스티커 메모 카드)
  function addMemo() {
    const html = (draftHtml || "").trim();
    const plain = stripHtml(html);
    if (!plain) return;
    const group = activeGroup || groups[0] || "기본";
    const nextMemo = {
      id: Date.now().toString(),
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
          <p className="text-[11px] text-gray-400">
            리뷰 답변에 쓸 문장을 그때그때 모아두고 조합해 보세요.
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
            "{clipboardMemo.memo?.text?.slice(0, 20) || "메모"}" 를{" "}
            {clipboardMemo.mode === "cut" ? "잘라냈어요" : "복사했어요"}.
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={pasteClipboardToActiveGroup}
              className="px-2 py-1 rounded-full border border-amber-300 bg-white/70 hover:bg-white text-[11px] font-medium"
            >
              현재 그룹에 붙여넣기
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

      {/* 상단: 그룹(폴더) 바 */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-600">
            메모 그룹 (폴더)
          </span>
          <span className="text-[11px] text-gray-400">
            드래그로 순서 변경, ✏️ 로 이름 편집
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <div
              key={g}
              className={
                "flex items-center gap-1 shrink-0 rounded-full px-0.5 py-0.5 transition-colors " +
                (dragOverGroup === g && draggingGroup && draggingGroup !== g
                  ? "bg-violet-50/90"
                  : "bg-transparent")
              }
              draggable
              onDragStart={() => handleGroupDragStart(g)}
              onDragOver={(e) => handleGroupDragOver(e, g)}
              onDrop={(e) => handleGroupDrop(e, g)}
              onDragEnd={handleGroupDragEnd}
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
                      cancelEditGroup();
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs border border-indigo-300 bg-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[80px]"
                />
              ) : (
                <button
                  onClick={() => setActiveGroup(g)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer select-none " +
                    (activeGroup === g
                      ? "bg-gradient-to-r from-[#7b5cfa] to-[#a084ff] text-white border-transparent shadow-sm"
                      : "bg-white/80 border-gray-200 text-gray-700 hover:bg-white")
                  }
                  title="드래그해서 순서 변경 가능"
                >
                  {g}
                </button>
              )}

              {activeGroup === g && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <button
                    onClick={() => moveGroup(g, -1)}
                    className="text-[11px] text-gray-400 hover:text-gray-700"
                    title="왼쪽으로 이동"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => moveGroup(g, 1)}
                    className="text-[11px] text-gray-400 hover:text-gray-700"
                    title="오른쪽으로 이동"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => startEditGroup(g)}
                    className="text-[11px] text-gray-400 hover:text-indigo-500"
                    title="그룹 이름 편집"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteGroup(g)}
                    className="text-[11px] text-gray-300 hover:text-red-500"
                    title="그룹 삭제"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* 새 그룹 생성 */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="새 그룹"
              className="input px-2 py-1 text-xs w-28"
            />
            <button
              onClick={createGroup}
              className="px-2 py-1 rounded-md text-xs bg-white/80 border border-gray-200 hover:bg-gray-50"
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 상단: 새 메모 입력 카드 (연한 노란 메모 느낌 유지) */}
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
            data-placeholder="여기에 새 메모를 자유롭게 적어보세요."
            onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
          />

          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[11px] text-amber-500">
              자주 쓰는 표현, 완성된 답변, 문장 조각들을 저장해 두고 재활용해 보세요.
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

      {/* 메모 리스트 - 파스텔 스티커 메모 */}
      <div className="flex-1 flex flex-col">
        {currentMemos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-4">
            아직 이 그룹에는 메모가 없어요. 위에서 새 메모를 만들고,
            리뷰 답변에 자주 쓰는 문장을 차곡차곡 모아보세요 ✨
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {currentMemos.map((m) => {
              const contentHtml =
                m.html || (m.text ? m.text.replace(/\n/g, "<br />") : "");
              const firstLine = (m.text || "").split("\n")[0] || "제목 없음";
              const color = m.color || getRandomColor();

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className="relative rounded-xl shadow-md border border-black/5 overflow-hidden"
                  style={{
                    backgroundColor: color,
                  }}
                >
                  {/* 상단 작은 테이프 느낌 */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-b-full bg-white/70 shadow" />

                  {/* 카드 상단 헤더 (제목 + 액션 버튼들) */}
                  <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-gray-500 mb-0.5">
                        메모
                      </div>
                      <div className="text-xs font-semibold text-gray-800 truncate">
                        {firstLine}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5 text-[11px]">
                        <button
                          onClick={() => copyMemo(m)}
                          className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white"
                          title="복사"
                        >
                          📄
                        </button>
                        <button
                          onClick={() => cutMemo(m)}
                          className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white"
                          title="잘라내기"
                        >
                          ✂️
                        </button>
                        <button
                          onClick={() => removeMemo(m.id)}
                          className="px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white text-red-500"
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>

                      {/* 색상 선택 점 */}
                      <div className="flex items-center gap-1">
                        {PASTEL_NOTE_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateMemoColor(m.id, c)}
                            className={
                              "w-3 h-3 rounded-full border border-black/10 focus:outline-none" +
                              (c === color ? " ring-2 ring-black/20" : "")
                            }
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 본문 영역 */}
                  <div className="px-3 pb-2">
                    <div
                      className="text-sm whitespace-pre-wrap leading-relaxed focus:outline-none rounded-md px-2 py-2 max-h-40 overflow-y-auto bg-white/30"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        updateMemoHtml(m.id, e.currentTarget.innerHTML)
                      }
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </div>

                  {/* 하단 메타/액션 영역 */}
                  <div className="px-3 pb-3 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-col gap-1 text-gray-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 border border-white/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        그룹: <span className="font-medium">{activeGroup}</span>
                      </span>
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

                    <div className="flex items-center gap-1">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          moveMemoToGroup(m.id, e.target.value);
                          e.target.value = "";
                        }}
                        className="border border-gray-200 rounded-full px-2 py-1 bg-white/80 text-[11px]"
                      >
                        <option value="">그룹 이동</option>
                        {groups
                          .filter((g) => g !== activeGroup)
                          .map((g) => (
                            <option key={g} value={g}>
                              {g}로 이동
                            </option>
                          ))}
                      </select>
                    </div>
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
