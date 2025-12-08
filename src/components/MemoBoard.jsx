import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

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

  const draftEditorRef = useRef(null);

  // 실제 그룹 목록 = 저장된 순서 + memos 키들의 합집합
  const allMemoGroups = Object.keys(memos);
  const groups = Array.from(
    new Set([...(groupsOrder || []), ...allMemoGroups])
  );

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

  // 그룹 순서 이동
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
          <h2 className="text-sm font-semibold text-gray-800">
            메모 보드
          </h2>
          <p className="text-[11px] text-gray-400">
            스티커 메모 느낌으로 가볍게 적고, 그룹으로 정리해보세요.
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

      {/* 클립보드 상태 (복사/잘라내기) */}
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
            폴더를 눌러 전환하고, 화살표로 순서를 바꿀 수 있어요.
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <div key={g} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveGroup(g)}
                className={
                  "px-3 py-1.5 rounded-full text-xs border transition-colors " +
                  (activeGroup === g
                    ? "bg-gradient-to-r from-[#7b5cfa] to-[#a084ff] text-white border-transparent shadow-sm"
                    : "bg-white/80 border-gray-200 text-gray-700 hover:bg-white")
                }
              >
                {g}
              </button>
              {activeGroup === g && (
                <>
