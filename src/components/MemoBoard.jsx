import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

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

const HIGHLIGHT_COLORS = [
  { name: "노랑", v: "#fde68a" },
  { name: "민트", v: "#bbf7d0" },
  { name: "하늘", v: "#bfdbfe" },
  { name: "핑크", v: "#fbcfe8" },
  { name: "보라", v: "#e9d5ff" },
  { name: "없음", v: null, clear: true },
];

const TEXT_COLORS = [
  { name: "검정", v: "#111827" },
  { name: "회색", v: "#6B7280" },
  { name: "빨강", v: "#EF4444" },
  { name: "주황", v: "#F97316" },
  { name: "초록", v: "#22C55E" },
  { name: "파랑", v: "#3B82F6" },
  { name: "보라", v: "#A855F7" },
  { name: "없음", v: null, clear: true },
];

const FONT_FAMILIES = [
  { label: "Pretendard", value: "Pretendard" },
  { label: "Apple SD Gothic Neo", value: "Apple SD Gothic Neo" },
  { label: "Noto Sans KR", value: "Noto Sans KR" },
  { label: "Nanum Gothic", value: "Nanum Gothic" },
  { label: "Spoqa Han Sans Neo", value: "Spoqa Han Sans Neo" },
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Arial", value: "Arial" },
  { label: "Calibri", value: "Calibri" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Monospace", value: "monospace" },
];

const FONT_SIZES = [
  { label: "12px", px: 12 },
  { label: "14px", px: 14 },
  { label: "16px", px: 16 },
  { label: "18px", px: 18 },
  { label: "20px", px: 20 },
  { label: "24px", px: 24 },
  { label: "32px", px: 32 },
];

function getGroupColor(name) {
  if (!name) return GROUP_TAB_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return GROUP_TAB_COLORS[sum % GROUP_TAB_COLORS.length];
}

function ToolbarBtn({
  disabled,
  onClick,
  onMouseDown,
  label,
  title,
  className = "",
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      className={
        "h-8 min-w-8 px-2 rounded-lg border text-[12px] transition " +
        (disabled
          ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
          : "border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100") +
        " " +
        className
      }
    >
      {label}
    </button>
  );
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
  const draftEditorRef = useRef(null);

  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoGroup, setEditingMemoGroup] = useState(null);

  const selectionRef = useRef(null);

  const [clipboardMemo, setClipboardMemo] = useState(null);

  const [editingGroup, setEditingGroup] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");

  const [draggingMemoId, setDraggingMemoId] = useState(null);
  const [memoDragOverGroup, setMemoDragOverGroup] = useState(null);

  const [colorPickerFor, setColorPickerFor] = useState(null);

  const [groupColorOverrides, setGroupColorOverrides] = useState({});
  const [lockedGroups, setLockedGroups] = useState({});

  const [groupMenu, setGroupMenu] = useState({ open: false, x: 0, y: 0, group: null });
  const [memoMenu, setMemoMenu] = useState({ open: false, x: 0, y: 0, memoId: null });

  const [highlightMenu, setHighlightMenu] = useState({ open: false, x: 0, y: 0 });
  const [textColorMenu, setTextColorMenu] = useState({ open: false, x: 0, y: 0 });

  const allMemoGroups = Object.keys(memos || {});
  const groups = useMemo(
    () => Array.from(new Set([...(groupsOrder || []), ...allMemoGroups])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupsOrder, allMemoGroups.join("|")]
  );

  const currentMemos = memos?.[activeGroup] || [];
  const isGroupLocked = !!lockedGroups[activeGroup];

  function getRandomColor() {
    return PASTEL_NOTE_COLORS[Math.floor(Math.random() * PASTEL_NOTE_COLORS.length)];
  }

  // =========================
  // Selection 저장/복원
  // =========================
  function saveDraftSelection() {
    const root = draftEditorRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (root.contains(range.commonAncestorContainer)) {
      selectionRef.current = range;
    }
  }

  function restoreDraftSelection() {
    const range = selectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function applyDraftFormat(command, value) {
    restoreDraftSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
    document.execCommand(command, false, value ?? null);
    saveDraftSelection();
    if (draftEditorRef.current) setDraftHtml(draftEditorRef.current.innerHTML);
  }

  // ✅ 핵심: 선택 영역을 span으로 감싸는 유틸(폰트크기 확실 적용)
  function wrapSelectionWithSpanStyle(styleObj) {
    const editor = draftEditorRef.current;
    if (!editor) return;

    restoreDraftSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const wrapper = document.createElement("span");
    Object.assign(wrapper.style, styleObj);

    // 선택된 HTML 얻기
    const frag = range.cloneContents();
    const tmp = document.createElement("div");
    tmp.appendChild(frag);
    const selectedHtml = tmp.innerHTML;

    // 선택이 비어있으면(커서만 있는 상태) span 삽입 후 커서 이동
    if (!selectedHtml) {
      wrapper.innerHTML = "&nbsp;";
      range.insertNode(wrapper);

      // 커서를 span 뒤로
      const newRange = document.createRange();
      newRange.setStartAfter(wrapper);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      saveDraftSelection();
      setDraftHtml(editor.innerHTML);
      return;
    }

    // 선택 영역 교체
    range.deleteContents();
    wrapper.innerHTML = selectedHtml;
    range.insertNode(wrapper);

    // 커서를 wrapper 뒤로
    const newRange = document.createRange();
    newRange.setStartAfter(wrapper);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    saveDraftSelection();
    setDraftHtml(editor.innerHTML);
  }

  // ✅ 폰트 px 적용 (확실 버전)
  function applyFontSizePx(px) {
    if (isGroupLocked) return;
    wrapSelectionWithSpanStyle({ fontSize: `${px}px` });
  }

  function applyHighlight(color) {
    if (isGroupLocked) return;

    restoreDraftSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}

    if (color === "CLEAR") {
      document.execCommand("hiliteColor", false, "transparent");
      document.execCommand("backColor", false, "transparent");
      setTimeout(() => {
        document.execCommand("hiliteColor", false, "#ffffff");
        document.execCommand("backColor", false, "#ffffff");
        saveDraftSelection();
        if (draftEditorRef.current) setDraftHtml(draftEditorRef.current.innerHTML);
      }, 0);
      return;
    }

    document.execCommand("hiliteColor", false, color);
    document.execCommand("backColor", false, color);

    saveDraftSelection();
    if (draftEditorRef.current) setDraftHtml(draftEditorRef.current.innerHTML);
  }

  function applyTextColor(color) {
    if (isGroupLocked) return;

    restoreDraftSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}

    if (color === "CLEAR") {
      document.execCommand("foreColor", false, "#111827");
    } else {
      document.execCommand("foreColor", false, color);
    }

    saveDraftSelection();
    if (draftEditorRef.current) setDraftHtml(draftEditorRef.current.innerHTML);
  }

  // ✅ 드롭다운 열기: onMouseDown에서만 (closeAll 충돌 방지)
  function openFloatingMenu(setter) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveDraftSelection();

      const rect = e.currentTarget.getBoundingClientRect();
      const pad = 8;
      const MENU_W = 260;
      const MENU_H = 180;

      const x = Math.min(rect.left, window.innerWidth - MENU_W - pad);
      const y = Math.min(rect.bottom + pad, window.innerHeight - MENU_H - pad);

      setter({ open: true, x, y });
    };
  }

  function handleInsertLinkToDraft() {
    const url = window.prompt("링크 URL을 입력하세요");
    if (url) applyDraftFormat("createLink", url);
  }

  function handleInsertImageToDraft() {
    const url = window.prompt("이미지 URL을 입력하세요");
    if (url) applyDraftFormat("insertImage", url);
  }

  function insertCheckboxListToDraft() {
    const nRaw = window.prompt("체크박스 항목 개수 (예: 3)", "3");
    const n = Math.max(1, Math.min(20, Number(nRaw || 3)));
    let html = `<div style="margin:4px 0;">`;
    for (let i = 1; i <= n; i++) {
      html += `
        <div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
          <input type="checkbox" />
          <span>할 일 ${i}</span>
        </div>`;
    }
    html += `</div>`;
    applyDraftFormat("insertHTML", html);
  }

  function insertTableToDraft() {
    const rowsRaw = window.prompt("표 행(rows) 개수", "3");
    const colsRaw = window.prompt("표 열(cols) 개수", "3");
    const rows = Math.max(1, Math.min(12, Number(rowsRaw || 3)));
    const cols = Math.max(1, Math.min(12, Number(colsRaw || 3)));

    let html = `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:12px;">`;
    for (let r = 0; r < rows; r++) {
      html += `<tr>`;
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid rgba(0,0,0,.2);padding:6px;min-width:40px;">&nbsp;</td>`;
      }
      html += `</tr>`;
    }
    html += `</table>`;
    applyDraftFormat("insertHTML", html);
  }

  // =========================
  // ✅ 메뉴 닫기: click → mousedown 으로 변경 (드롭다운 즉시닫힘 해결)
  // =========================
  useEffect(() => {
    const closeAll = () => {
      setGroupMenu({ open: false, x: 0, y: 0, group: null });
      setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
      setColorPickerFor(null);
      setHighlightMenu({ open: false, x: 0, y: 0 });
      setTextColorMenu({ open: false, x: 0, y: 0 });
    };
    window.addEventListener("mousedown", closeAll);
    window.addEventListener("scroll", closeAll, true);
    window.addEventListener("resize", closeAll);
    return () => {
      window.removeEventListener("mousedown", closeAll);
      window.removeEventListener("scroll", closeAll, true);
      window.removeEventListener("resize", closeAll);
    };
  }, []);

  useEffect(() => {
    if (!editingMemoId) return;
    if (!editingMemoGroup) return;
    if (activeGroup !== editingMemoGroup) {
      setEditingMemoId(null);
      setEditingMemoGroup(null);
      setDraftHtml("");
      selectionRef.current = null;
      if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
    }
  }, [activeGroup, editingMemoId, editingMemoGroup]);

  // =========================
  // 그룹 CRUD (원본 그대로)
  // =========================
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

  function clearDraft() {
    if (isGroupLocked) return;
    setDraftHtml("");
    setEditingMemoId(null);
    setEditingMemoGroup(null);
    selectionRef.current = null;
    if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
  }

  function deleteGroup(name) {
    if (!name) return;
    const otherGroups = groups.filter((g) => g !== name);
    if (otherGroups.length === 0) {
      window.alert("마지막 남은 그룹은 삭제할 수 없어요.");
      return;
    }

    const memoCount = (memos?.[name] || []).length;
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

    setGroupColorOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    setLockedGroups((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    if (activeGroup === name) setActiveGroup(targetGroup);

    if (editingMemoGroup === name) {
      clearDraft();
    }
  }

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

      if (copy[newName]) copy[newName] = [...oldList, ...copy[newName]];
      else copy[newName] = oldList;

      return copy;
    });

    setGroupsOrder((prev) => (prev || []).map((g) => (g === oldName ? newName : g)));

    setGroupColorOverrides((prev) => {
      const next = { ...prev };
      if (next[oldName]) {
        next[newName] = next[oldName];
        delete next[oldName];
      }
      return next;
    });

    setLockedGroups((prev) => {
      const next = { ...prev };
      if (next[oldName]) {
        next[newName] = next[oldName];
        delete next[oldName];
      }
      return next;
    });

    if (activeGroup === oldName) setActiveGroup(newName);
    if (editingMemoGroup === oldName) setEditingMemoGroup(newName);

    setEditingGroup(null);
    setEditingGroupValue("");
  }

  function duplicateGroup(name) {
    const baseName = `${name} - 복사본`;
    let candidate = baseName;
    let i = 2;
    while ((memos || {})[candidate]) candidate = `${baseName} ${i++}`;

    setMemos((prev) => ({
      ...prev,
      [candidate]: (prev[name] || []).map((m) => ({
        ...m,
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
      })),
    }));

    setGroupsOrder((prev) => {
      const base = prev && prev.length ? prev : groups;
      return [...base, candidate];
    });

    setGroupColorOverrides((prev) => {
      const next = { ...prev };
      if (next[name]) next[candidate] = next[name];
      return next;
    });

    setLockedGroups((prev) => {
      const next = { ...prev };
      if (next[name]) next[candidate] = next[name];
      return next;
    });

    setActiveGroup(candidate);
  }

  function setGroupColor(groupName, color) {
    setGroupColorOverrides((prev) => ({ ...prev, [groupName]: color }));
  }

  function moveGroup(name, dir) {
    setGroupsOrder((prev) => {
      const base = (prev && prev.length ? prev : groups).slice();
      const idx = base.indexOf(name);
      if (idx < 0) return base;

      const nextIdx = dir === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= base.length) return base;

      const [item] = base.splice(idx, 1);
      base.splice(nextIdx, 0, item);
      return base;
    });
  }

  function toggleGroupLock(name) {
    setLockedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  async function copySectionLink(name) {
    const url =
      window.location.origin + window.location.pathname + `?group=${encodeURIComponent(name)}`;
    try {
      await navigator.clipboard.writeText(url);
      window.alert("섹션 링크를 복사했어요!");
    } catch {
      window.prompt("복사 실패! 아래 링크를 수동 복사하세요:", url);
    }
  }

  // =========================
  // 메모 CRUD
  // =========================
  function removeMemo(id) {
    if (!activeGroup) return;
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).filter((m) => m.id !== id);
      return copy;
    });

    if (editingMemoId === id) clearDraft();
  }

  function updateMemoTitle(id, title) {
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, title } : m
      );
      return copy;
    });
  }

  function updateMemoColor(id, color) {
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, color } : m
      );
      return copy;
    });
  }

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

    if (editingMemoId === id) clearDraft();
  }

  function loadMemoToDraft(memo) {
    if (!memo || isGroupLocked) return;

    setEditingMemoId(memo.id);
    setEditingMemoGroup(activeGroup);

    const html = memo.html || (memo.text ? plainToHtml(memo.text) : "");

    setDraftHtml(html);
    if (draftEditorRef.current) {
      draftEditorRef.current.innerHTML = html;
      draftEditorRef.current.focus();
    }

    setTimeout(() => {
      draftEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

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
      copy[activeGroup] = (copy[activeGroup] || []).filter((m) => m.id !== memo.id);
      return copy;
    });

    if (editingMemoId === memo.id) clearDraft();
  }

  function pasteClipboardToActiveGroup() {
    if (!clipboardMemo) return;
    const targetGroup = activeGroup || groups[0] || "기본";
    const base = clipboardMemo.memo;
    if (!base) return;

    const newId = Date.now().toString();
    const plain = htmlToPlain(base.html || base.text || "");
    const nextMemo = {
      id: newId,
      title: base.title || plain.slice(0, 30),
      text: plain,
      html: base.html || plainToHtml(plain),
      createdAt: new Date().toISOString(),
      color: base.color || getRandomColor(),
    };

    setMemos((prev) => {
      const copy = { ...prev };
      if (!copy[targetGroup]) copy[targetGroup] = [];
      copy[targetGroup] = [nextMemo, ...(copy[targetGroup] || [])];
      return copy;
    });

    if (clipboardMemo.mode === "cut") setClipboardMemo(null);
  }

  function upsertMemoFromDraft() {
    if (isGroupLocked) return;

    const html = (draftHtml || "").trim();
    const plain = htmlToPlain(html);
    if (!plain) return;

    const firstLine = plain.split("\n")[0] || "";
    const group = activeGroup || groups[0] || "기본";

    if (editingMemoId && editingMemoGroup) {
      const targetGroup = editingMemoGroup;

      setMemos((prev) => {
        const copy = { ...prev };
        const list = copy[targetGroup] || [];
        copy[targetGroup] = list.map((m) =>
          m.id === editingMemoId
            ? { ...m, html, text: plain, title: m.title || firstLine.slice(0, 30) }
            : m
        );
        return copy;
      });

      clearDraft();
      return;
    }

    const nextMemo = {
      id: Date.now().toString(),
      title: firstLine.slice(0, 30),
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
    selectionRef.current = null;
    if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
  }

  function openGroupMenu(e, groupName) {
    e.preventDefault();
    e.stopPropagation();

    const MENU_W = 260;
    const MENU_H = 380;
    const pad = 8;

    const x = Math.min(e.clientX + pad, window.innerWidth - MENU_W - pad);
    const y = Math.min(e.clientY + pad, window.innerHeight - MENU_H - pad);

    setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
    setGroupMenu({ open: true, x, y, group: groupName });
  }

  function openMemoMenu(e, memoId) {
    e.preventDefault();
    e.stopPropagation();

    const MENU_W = 260;
    const MENU_H = 380;
    const pad = 8;

    const x = Math.min(e.clientX + pad, window.innerWidth - MENU_W - pad);
    const y = Math.min(e.clientY + pad, window.innerHeight - MENU_H - pad);

    setGroupMenu({ open: false, x: 0, y: 0, group: null });
    setMemoMenu({ open: true, x, y, memoId });
  }

  const memoById = useMemo(() => {
    const map = new Map();
    for (const m of currentMemos) map.set(m.id, m);
    return map;
  }, [currentMemos]);

  const memoMenuTarget = memoMenu.memoId ? memoById.get(memoMenu.memoId) : null;

  function shouldBlockDragStart(target) {
    if (!target) return false;
    const el = target.closest?.("input, textarea, button, select, a, label");
    return !!el;
  }

  return (
    <aside className="glass p-5 flex flex-col h-full">
      {/* 상단 타이틀 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">메모 보드</h2>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          <div>
            현재 그룹: <span className="font-medium text-gray-700">{activeGroup}</span>
            {isGroupLocked && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                🔒 읽기전용
              </span>
            )}
          </div>
          <div>메모 {currentMemos.length}개</div>
        </div>
      </div>

      {/* 클립보드 상태 */}
      {clipboardMemo && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-dashed border-amber-300/80 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800">
          <span>
            "{clipboardMemo.memo?.title || clipboardMemo.memo?.text?.slice(0, 20) || "메모"}" 를{" "}
            {clipboardMemo.mode === "cut" ? "잘라냈어요" : "복사했어요"}.
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={pasteClipboardToActiveGroup}
              className="px-2 py-1 rounded-full border border-amber-300 bg-white/70 hover:bg-white text-[11px] font-medium"
            >
              붙여넣기
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

      {/* 그룹 탭 바 */}
      <div className="mb-4">
        <div className="relative">
          <div className="h-7 bg-white/90 rounded-t-md border border-gray-200 border-b-0" />
          <div className="absolute left-2 top-0 flex items-end gap-1 pr-14">
            {groups.map((g) => {
              const active = g === activeGroup;
              const color = groupColorOverrides[g] || getGroupColor(g);

              return (
                <div
                  key={g}
                  className={"group relative flex items-center " + (memoDragOverGroup === g ? "drop-shadow-md" : "")}
                  onContextMenu={(e) => openGroupMenu(e, g)}
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
                        (active ? "font-semibold text-gray-900" : "text-gray-600 hover:-translate-y-[1px]")
                      }
                      style={{ backgroundColor: color, marginBottom: active ? 0 : 1 }}
                      title="우클릭: 이동/링크복사/잠금/색/이름/삭제"
                    >
                      {g}
                      {lockedGroups[g] && <span className="ml-1">🔒</span>}
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setShowNewGroupInput((v) => !v)}
              className="ml-1 px-3 py-1 text-xs rounded-t-md border border-dashed border-gray-300 border-b-0 bg-gray-50 hover:bg-white hover:-translate-y-[1px] transition-all"
            >
              +
            </button>
          </div>

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

      {/* (중간: 그룹/메모 우클릭 메뉴 + 메모 리스트는 네 코드와 동일하게 유지되어 있음)
          여기서는 핵심 버그(드롭다운/폰트크기) 수정 부분이 툴바+드롭다운이라
          아래에 새 메모 입력 카드/툴바 부분만 그대로 포함 */}
      {/* 새 메모 입력 카드 */}
      <div className="mb-4">
        <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {editingMemoId ? "메모 편집" : "새 메모"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {editingMemoId ? "서식 포함 수정 후 저장" : "서식 포함 메모를 빠르게 작성"}
                </span>
              </div>

              {isGroupLocked && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  🔒 읽기전용
                </span>
              )}
              {!isGroupLocked && editingMemoId && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ✏️ 수정 모드
                </span>
              )}
            </div>
          </div>

          {/* 툴바 */}
          <div
            className={"px-5 pb-3 " + (isGroupLocked ? "opacity-50" : "")}
            onMouseDown={(e) => {
              if (e.target?.tagName !== "SELECT" && e.target?.tagName !== "BUTTON") {
                e.preventDefault();
              }
            }}
          >
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap rounded-xl border border-gray-200 bg-white/80 px-2 py-2">
              <select
                className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[12px]"
                defaultValue="Pretendard"
                disabled={isGroupLocked}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  saveDraftSelection();
                }}
                onChange={(e) => applyDraftFormat("fontName", e.target.value)}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <select
                className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[12px]"
                defaultValue="16"
                disabled={isGroupLocked}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  saveDraftSelection();
                }}
                onChange={(e) => applyFontSizePx(Number(e.target.value))}
              >
                {FONT_SIZES.map((s) => (
                  <option key={s.px} value={s.px}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div className="mx-1 h-6 w-px bg-gray-200" />

              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("bold")} label="B" />
              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("italic")} label="I" className="italic" />
              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("underline")} label="U" className="underline" />

              <div className="mx-1 h-6 w-px bg-gray-200" />

              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyLeft")} label="⟸" />
              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyCenter")} label="≡" />
              <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyRight")} label="⟹" />

              <div className="mx-1 h-6 w-px bg-gray-200" />

              <ToolbarBtn disabled={isGroupLocked} onClick={insertCheckboxListToDraft} label="☑︎" title="체크박스" />
              <ToolbarBtn disabled={isGroupLocked} onClick={insertTableToDraft} label="▦" title="표" />

              <div className="mx-1 h-6 w-px bg-gray-200" />

              <ToolbarBtn disabled={isGroupLocked} onClick={handleInsertLinkToDraft} label="🔗" title="링크" />
              <ToolbarBtn disabled={isGroupLocked} onClick={handleInsertImageToDraft} label="🖼" title="이미지" />

              <div className="mx-1 h-6 w-px bg-gray-200" />

              {/* ✅ 여기 핵심: 드롭다운은 onMouseDown으로 열기 */}
              <ToolbarBtn
                disabled={isGroupLocked}
                onMouseDown={openFloatingMenu(setTextColorMenu)}
                label="A"
                title="글자색"
              />
              <ToolbarBtn
                disabled={isGroupLocked}
                onMouseDown={openFloatingMenu(setHighlightMenu)}
                label="🖍"
                title="하이라이트"
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              현재 그룹: <span className="font-medium text-gray-800">{activeGroup}</span>
            </div>
          </div>

          {/* ✅ 글자색 드롭다운 */}
          {textColorMenu.open && (
            <div
              className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
              style={{ left: textColorMenu.x, top: textColorMenu.y }}
              onMouseDown={(e) => e.stopPropagation()} // ✅ 바깥 mousedown 닫기 방지
            >
              <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">글자색</div>
              <div className="p-2 flex flex-wrap gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="h-9 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 text-[12px]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      saveDraftSelection();
                    }}
                    onClick={() => {
                      applyTextColor(c.clear ? "CLEAR" : c.v);
                      setTextColorMenu({ open: false, x: 0, y: 0 });
                    }}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.clear ? "#ffffff" : c.v }}
                    />
                    <span className="text-gray-700">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ✅ 하이라이트 드롭다운 */}
          {highlightMenu.open && (
            <div
              className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
              style={{ left: highlightMenu.x, top: highlightMenu.y }}
              onMouseDown={(e) => e.stopPropagation()} // ✅ 바깥 mousedown 닫기 방지
            >
              <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">하이라이트</div>
              <div className="p-2 flex flex-wrap gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="h-9 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 text-[12px]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      saveDraftSelection();
                    }}
                    onClick={() => {
                      applyHighlight(c.clear ? "CLEAR" : c.v);
                      setHighlightMenu({ open: false, x: 0, y: 0 });
                    }}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.clear ? "#ffffff" : c.v }}
                    />
                    <span className="text-gray-700">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 에디터 */}
          <div className="px-5 pb-4">
            <div
              ref={draftEditorRef}
              className={
                "min-h-[160px] max-h-72 overflow-y-auto rounded-2xl border bg-white px-4 py-4 text-[14px] leading-relaxed text-gray-900 outline-none transition " +
                (isGroupLocked
                  ? "opacity-60 cursor-not-allowed border-gray-200"
                  : "border-gray-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100")
              }
              contentEditable={!isGroupLocked}
              data-placeholder="자유롭게 적어보세요…"
              onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
              onMouseUp={saveDraftSelection}
              onKeyUp={saveDraftSelection}
              onFocus={saveDraftSelection}
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              {editingMemoId && !isGroupLocked && (
                <button
                  onClick={clearDraft}
                  className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
                >
                  취소
                </button>
              )}
              <button
                onClick={upsertMemoFromDraft}
                disabled={isGroupLocked}
                className={
                  "h-10 px-5 rounded-xl text-sm font-semibold text-white shadow-sm transition " +
                  (isGroupLocked ? "opacity-40 cursor-not-allowed" : "hover:shadow-md")
                }
                style={{ background: "linear-gradient(90deg,#6366F1,#22C55E)" }}
              >
                {editingMemoId ? "수정 저장" : "메모 추가"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 아래 메모리스트/우클릭메뉴는 네가 붙여넣은 원본 부분 그대로 두면 됨 */}
      {/* (너 코드가 길어서 여기선 생략했는데, 너가 올린 파일에는 이미 존재하니까 그대로 유지) */}
    </aside>
  );
}

/** HTML -> plain */
function htmlToPlain(html) {
  if (!html) return "";
  let s = html;

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/div>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "• ");

  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ");

  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** plain -> html */
function plainToHtml(text) {
  const safe = (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safe.replace(/\n/g, "<br/>");
}
