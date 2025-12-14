"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/* =======================
   상수
======================= */

const PASTEL_NOTE_COLORS = [
  "#FEF3C7",
  "#E0F2FE",
  "#EDE9FE",
  "#DCFCE7",
  "#FCE7F3",
  "#FFEDD5",
  "#F5F5F4",
];

const GROUP_TAB_COLORS = ["#BFDBFE", "#FBCFE8", "#FDE68A", "#C7D2FE", "#BBF7D0"];

const FONT_FAMILIES = [
  "Pretendard",
  "Apple SD Gothic Neo",
  "Noto Sans KR",
  "Nanum Gothic",
  "Spoqa Han Sans Neo",
  "Inter",
  "Roboto",
  "Arial",
  "Calibri",
  "Times New Roman",
  "monospace",
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32];

const TEXT_COLORS = [
  { name: "검정", v: "#111827" },
  { name: "회색", v: "#6B7280" },
  { name: "빨강", v: "#EF4444" },
  { name: "주황", v: "#F97316" },
  { name: "초록", v: "#22C55E" },
  { name: "파랑", v: "#3B82F6" },
  { name: "보라", v: "#A855F7" },
];

const HIGHLIGHT_COLORS = [
  { name: "노랑", v: "#fde68a" },
  { name: "민트", v: "#bbf7d0" },
  { name: "하늘", v: "#bfdbfe" },
  { name: "핑크", v: "#fbcfe8" },
  { name: "보라", v: "#e9d5ff" },
];

/* =======================
   유틸
======================= */

function ToolbarBtn({ disabled, onClick, label, title }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={
        "h-8 min-w-8 px-2 rounded-lg border text-[12px] transition " +
        (disabled
          ? "opacity-40 cursor-not-allowed border-gray-200"
          : "border-gray-200 hover:bg-gray-50")
      }
    >
      {label}
    </button>
  );
}

/* =======================
   컴포넌트
======================= */

export default function MemoBoard({
  memos,
  setMemos,
  activeGroup,
  setActiveGroup,
  groupsOrder,
  setGroupsOrder,
}) {
  const draftEditorRef = useRef(null);
  const selectionRef = useRef(null);

  const [draftHtml, setDraftHtml] = useState("");
  const [editingMemoId, setEditingMemoId] = useState(null);

  const [textColorMenu, setTextColorMenu] = useState(null);
  const [highlightMenu, setHighlightMenu] = useState(null);

  const currentMemos = memos?.[activeGroup] || [];

  /* =======================
     Selection 유지
  ======================= */

  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    selectionRef.current = sel.getRangeAt(0);
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (!sel || !selectionRef.current) return;
    sel.removeAllRanges();
    sel.addRange(selectionRef.current);
  }

  /* =======================
     서식
  ======================= */

  function exec(command, value) {
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
    document.execCommand(command, false, value ?? null);
    saveSelection();
    setDraftHtml(draftEditorRef.current.innerHTML);
  }

  function applyFontSize(px) {
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    const fonts = draftEditorRef.current.querySelectorAll('font[size="7"]');
    fonts.forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = px + "px";
      span.innerHTML = f.innerHTML;
      f.replaceWith(span);
    });
    setDraftHtml(draftEditorRef.current.innerHTML);
  }

  /* =======================
     UI
  ======================= */

  return (
    <aside className="p-5 flex flex-col h-full">
      {/* 새 메모 */}
      <div className="mb-4 rounded-2xl border bg-white p-4">
        {/* 툴바 */}
        <div
          className="flex flex-nowrap gap-1.5 overflow-x-auto border rounded-xl px-2 py-2"
          onMouseDown={(e) => {
            if (!["SELECT", "BUTTON"].includes(e.target.tagName))
              e.preventDefault();
          }}
        >
          {/* 폰트 */}
          <select
            onMouseDown={saveSelection}
            onChange={(e) => exec("fontName", e.target.value)}
            className="h-8 px-2 border rounded"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>

          {/* 크기 */}
          <select
            onMouseDown={saveSelection}
            onChange={(e) => applyFontSize(Number(e.target.value))}
            className="h-8 px-2 border rounded"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>

          <ToolbarBtn label="B" onClick={() => exec("bold")} />
          <ToolbarBtn label="I" onClick={() => exec("italic")} />
          <ToolbarBtn label="U" onClick={() => exec("underline")} />

          <ToolbarBtn label="⟸" onClick={() => exec("justifyLeft")} />
          <ToolbarBtn label="≡" onClick={() => exec("justifyCenter")} />
          <ToolbarBtn label="⟹" onClick={() => exec("justifyRight")} />

          {/* ❌ • / 1. 완전 제거됨 */}

          <ToolbarBtn label="☑︎" onClick={() => exec("insertHTML", "☐ ")} />
          <ToolbarBtn label="▦" onClick={() => exec("insertHTML", "<table><tr><td></td></tr></table>")} />

          <ToolbarBtn label="🔗" onClick={() => exec("createLink", prompt("URL"))} />
          <ToolbarBtn label="🖼" onClick={() => exec("insertImage", prompt("이미지 URL"))} />

          {/* 글자색 */}
          <ToolbarBtn
            label="A"
            onClick={(e) => {
              saveSelection();
              setTextColorMenu(e.currentTarget.getBoundingClientRect());
            }}
          />

          {/* 하이라이트 */}
          <ToolbarBtn
            label="🖍"
            onClick={(e) => {
              saveSelection();
              setHighlightMenu(e.currentTarget.getBoundingClientRect());
            }}
          />
        </div>

        {/* 에디터 */}
        <div
          ref={draftEditorRef}
          contentEditable
          className="mt-3 min-h-[160px] border rounded-xl p-3 outline-none"
          onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
        />
      </div>

      {/* 글자색 드롭다운 */}
      {textColorMenu && (
        <div
          className="fixed bg-white border rounded-xl p-2 flex gap-2"
          style={{ left: textColorMenu.left, top: textColorMenu.bottom + 8 }}
        >
          {TEXT_COLORS.map((c) => (
            <button
              key={c.v}
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: c.v }}
              onClick={() => {
                exec("foreColor", c.v);
                setTextColorMenu(null);
              }}
            />
          ))}
        </div>
      )}

      {/* 하이라이트 드롭다운 */}
      {highlightMenu && (
        <div
          className="fixed bg-white border rounded-xl p-2 flex gap-2"
          style={{ left: highlightMenu.left, top: highlightMenu.bottom + 8 }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.v}
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: c.v }}
              onClick={() => {
                exec("hiliteColor", c.v);
                setHighlightMenu(null);
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
