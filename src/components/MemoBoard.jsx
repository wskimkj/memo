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

function getGroupColor(name) {
  if (!name) return GROUP_TAB_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return GROUP_TAB_COLORS[sum % GROUP_TAB_COLORS.length];
}
function ToolbarBtn({ disabled, onClick, label, title, className = "" }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
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

  // 메인(새 메모) 편집기
  const [draftHtml, setDraftHtml] = useState("");
  const draftEditorRef = useRef(null);

  // ✅ “수정” 모드 (편집 중인 메모)
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoGroup, setEditingMemoGroup] = useState(null);

  // ✅ 드롭다운/툴바 클릭해도 selection 유지 (draft 전용)
  const selectionRef = useRef(null);

  const [clipboardMemo, setClipboardMemo] = useState(null);

  const [editingGroup, setEditingGroup] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");

  const [draggingMemoId, setDraggingMemoId] = useState(null);
  const [memoDragOverGroup, setMemoDragOverGroup] = useState(null);

  const [colorPickerFor, setColorPickerFor] = useState(null);

  const [groupColorOverrides, setGroupColorOverrides] = useState({});
  const [lockedGroups, setLockedGroups] = useState({});

  const [groupMenu, setGroupMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    group: null,
  });

  const [memoMenu, setMemoMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    memoId: null,
  });

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
  // Selection 저장/복원 (draft 전용)
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

  // =========================
  // Draft 삽입 도구
  // =========================
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
  // 메뉴 닫기
  // =========================
  useEffect(() => {
    const closeAll = () => {
      setGroupMenu({ open: false, x: 0, y: 0, group: null });
      setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
      setColorPickerFor(null);
    };
    window.addEventListener("click", closeAll);
    window.addEventListener("scroll", closeAll, true);
    window.addEventListener("resize", closeAll);
    return () => {
      window.removeEventListener("click", closeAll);
      window.removeEventListener("scroll", closeAll, true);
      window.removeEventListener("resize", closeAll);
    };
  }, []);

  // ✅ 편집 중에 그룹 바꾸면 자동 취소(저장 그룹 꼬임 방지)
  useEffect(() => {
    if (!editingMemoId) return;
    if (!editingMemoGroup) return;
    if (activeGroup !== editingMemoGroup) {
      // 그룹 변경 시 편집 취소
      setEditingMemoId(null);
      setEditingMemoGroup(null);
      setDraftHtml("");
      selectionRef.current = null;
      if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
    }
  }, [activeGroup, editingMemoId, editingMemoGroup]);

  // =========================
  // 그룹 CRUD
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

    // 편집 중이던 그룹 삭제하면 편집도 취소
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

    // 편집 그룹 이름 변경되면 추적 업데이트
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

  function updateMemoHtml(id, html) {
    const plain = htmlToPlain(html);
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, html, text: plain } : m
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

  // =========================
  // 저장된 메모 -> 메인 편집기로 불러오기
  // =========================
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

  // =========================
  // 클립보드
  // =========================
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

  // =========================
  // Draft 저장: 추가 / 수정 저장
  // =========================
  function clearDraft() {
    if (isGroupLocked) return;
    setDraftHtml("");
    setEditingMemoId(null);
    setEditingMemoGroup(null);
    selectionRef.current = null;
    if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
  }

  function upsertMemoFromDraft() {
    if (isGroupLocked) return;

    const html = (draftHtml || "").trim();
    const plain = htmlToPlain(html);
    if (!plain) return;

    const firstLine = plain.split("\n")[0] || "";
    const group = activeGroup || groups[0] || "기본";

    // ✅ 수정 저장: 편집 시작했던 그룹에서만 저장
    if (editingMemoId && editingMemoGroup) {
      const targetGroup = editingMemoGroup;

      setMemos((prev) => {
        const copy = { ...prev };
        const list = copy[targetGroup] || [];
        copy[targetGroup] = list.map((m) =>
          m.id === editingMemoId
            ? {
                ...m,
                html,
                text: plain,
                title: m.title || firstLine.slice(0, 30),
              }
            : m
        );
        return copy;
      });

      clearDraft();
      return;
    }

    // ✅ 새 메모 추가
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

  // =========================
  // 우클릭 메뉴 위치: 커서 근처
  // =========================
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

  // =========================
  // 드래그 시작 시 "입력/버튼/링크 클릭"이면 드래그 막기
  // =========================
  function shouldBlockDragStart(target) {
    if (!target) return false;
    const el = target.closest?.("input, textarea, button, select, a, label");
    return !!el;
  }

  // =========================
  // UI
  // =========================
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
            "
            {clipboardMemo.memo?.title ||
              clipboardMemo.memo?.text?.slice(0, 20) ||
              "메모"}
            " 를 {clipboardMemo.mode === "cut" ? "잘라냈어요" : "복사했어요"}.
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

      {/* 그룹 우클릭 메뉴 */}
      {groupMenu.open && (
        <div
          className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ left: groupMenu.x, top: groupMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">
            그룹: <span className="font-medium text-gray-800">{groupMenu.group}</span>
            {lockedGroups[groupMenu.group] && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                🔒 읽기전용
              </span>
            )}
          </div>

          <div className="px-2 py-2 flex gap-2">
            <button
              className="flex-1 px-2 py-2 rounded-lg border hover:bg-gray-50 text-sm"
              onClick={() => {
                moveGroup(groupMenu.group, "up");
                setGroupMenu({ open: false, x: 0, y: 0, group: null });
              }}
            >
              ⬅/⬆ 위로
            </button>
            <button
              className="flex-1 px-2 py-2 rounded-lg border hover:bg-gray-50 text-sm"
              onClick={() => {
                moveGroup(groupMenu.group, "down");
                setGroupMenu({ open: false, x: 0, y: 0, group: null });
              }}
            >
              ➡/⬇ 아래로
            </button>
          </div>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t"
            onClick={() => {
              copySectionLink(groupMenu.group);
              setGroupMenu({ open: false, x: 0, y: 0, group: null });
            }}
          >
            🔗 섹션 링크 복사
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              toggleGroupLock(groupMenu.group);
              setGroupMenu({ open: false, x: 0, y: 0, group: null });
            }}
          >
            {lockedGroups[groupMenu.group] ? "🔓 잠금 해제" : "🔒 그룹 잠금(읽기전용)"}
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t"
            onClick={() => {
              startEditGroup(groupMenu.group);
              setGroupMenu({ open: false, x: 0, y: 0, group: null });
            }}
          >
            ✏️ 이름 바꾸기
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              duplicateGroup(groupMenu.group);
              setGroupMenu({ open: false, x: 0, y: 0, group: null });
            }}
          >
            📄 그룹 복사(복제)
          </button>

          <div className="px-3 py-2 border-t">
            <div className="text-[11px] text-gray-500 mb-2">색상 변경</div>
            <div className="flex flex-wrap gap-1">
              {GROUP_TAB_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setGroupColor(groupMenu.group, c);
                    setGroupMenu({ open: false, x: 0, y: 0, group: null });
                  }}
                />
              ))}
              <button
                className="ml-auto text-[11px] px-2 py-1 rounded-md border hover:bg-gray-50"
                onClick={() => {
                  setGroupColorOverrides((prev) => {
                    const next = { ...prev };
                    delete next[groupMenu.group];
                    return next;
                  });
                  setGroupMenu({ open: false, x: 0, y: 0, group: null });
                }}
              >
                초기화
              </button>
            </div>
          </div>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 border-t"
            onClick={() => {
              deleteGroup(groupMenu.group);
              setGroupMenu({ open: false, x: 0, y: 0, group: null });
            }}
          >
            🗑 그룹 삭제
          </button>
        </div>
      )}

      {/* 메모 우클릭 메뉴 */}
      {memoMenu.open && memoMenuTarget && (
        <div
          className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ left: memoMenu.x, top: memoMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">
            메모: <span className="font-medium text-gray-800">{memoMenuTarget.title || "제목 없음"}</span>
          </div>

          <button
            disabled={isGroupLocked}
            className={
              "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 " +
              (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
            }
            onClick={() => {
              if (isGroupLocked) return;
              loadMemoToDraft(memoMenuTarget);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            ✏️ 편집(메인으로)
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t"
            onClick={() => {
              copyMemo(memoMenuTarget);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            📄 복사
          </button>

          <button
            disabled={isGroupLocked}
            className={
              "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 " +
              (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
            }
            onClick={() => {
              if (isGroupLocked) return;
              cutMemo(memoMenuTarget);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            ✂️ 잘라내기
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              pasteClipboardToActiveGroup();
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            📋 붙여넣기
          </button>

          <div className="px-3 py-2 border-t">
            <div className="text-[11px] text-gray-500 mb-2">메모 색상</div>
            <div className="flex flex-wrap gap-1">
              {PASTEL_NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    updateMemoColor(memoMenuTarget.id, c);
                    setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="px-3 py-2 border-t">
            <div className="text-[11px] text-gray-500 mb-2">다른 그룹으로 이동</div>
            <div className="flex flex-wrap gap-1">
              {groups
                .filter((g) => g !== activeGroup)
                .slice(0, 10)
                .map((g) => (
                  <button
                    key={g}
                    className="px-2 py-1 rounded-md border text-[11px] hover:bg-gray-50"
                    onClick={() => {
                      moveMemoToGroup(memoMenuTarget.id, g);
                      setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
                    }}
                  >
                    {g}
                  </button>
                ))}
            </div>
          </div>

          <button
            disabled={isGroupLocked}
            className={
              "w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 border-t " +
              (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
            }
            onClick={() => {
              if (isGroupLocked) return;
              removeMemo(memoMenuTarget.id);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            🗑 메모 삭제
          </button>
        </div>
      )}

     {/* 새 메모 입력 카드 (리디자인) */}
<div className="mb-4">
  <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden">
    {/* 헤더 */}
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

      <button
        onClick={clearDraft}
        disabled={isGroupLocked}
        className={
          "text-[12px] px-3 py-1.5 rounded-full border transition " +
          (isGroupLocked
            ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
            : "border-gray-200 text-gray-700 hover:bg-gray-50")
        }
      >
        비우기
      </button>
    </div>

    {/* 툴바 */}
    <div
      className={
        "px-5 pb-3 " + (isGroupLocked ? "opacity-50" : "")
      }
      onMouseDown={(e) => {
        // select는 기본 동작 필요
        if (e.target?.tagName !== "SELECT") e.preventDefault();
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-2 py-2">
        {/* 폰트 */}
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
          <option value="Pretendard">Pretendard</option>
          <option value="Arial">Arial</option>
          <option value="Calibri">Calibri</option>
          <option value="Times New Roman">Times</option>
        </select>

        {/* 크기 */}
        <select
          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[12px]"
          defaultValue="3"
          disabled={isGroupLocked}
          onMouseDown={(e) => {
            e.stopPropagation();
            saveDraftSelection();
          }}
          onChange={(e) => applyDraftFormat("fontSize", e.target.value)}
        >
          <option value="1">XS</option>
          <option value="2">S</option>
          <option value="3">M</option>
          <option value="4">L</option>
          <option value="5">XL</option>
          <option value="6">2XL</option>
          <option value="7">3XL</option>
        </select>

        <div className="mx-1 h-6 w-px bg-gray-200" />

        {/* 서식 버튼들 */}
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("bold")} label="B" />
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("italic")} label="I" className="italic" />
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("underline")} label="U" className="underline" />

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyLeft")} label="⟸" />
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyCenter")} label="≡" />
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("justifyRight")} label="⟹" />

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("insertUnorderedList")} label="•" />
        <ToolbarBtn disabled={isGroupLocked} onClick={() => applyDraftFormat("insertOrderedList")} label="1." />

        <ToolbarBtn disabled={isGroupLocked} onClick={insertCheckboxListToDraft} label="☑︎" title="체크박스" />
        <ToolbarBtn disabled={isGroupLocked} onClick={insertTableToDraft} label="▦" title="표" />

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <ToolbarBtn disabled={isGroupLocked} onClick={handleInsertLinkToDraft} label="🔗" title="링크" />
        <ToolbarBtn disabled={isGroupLocked} onClick={handleInsertImageToDraft} label="🖼" title="이미지" />

        <select
          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[12px]"
          defaultValue=""
          disabled={isGroupLocked}
          onMouseDown={(e) => {
            e.stopPropagation();
            saveDraftSelection();
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            applyDraftFormat("hiliteColor", v);
            applyDraftFormat("backColor", v);
            e.target.value = "";
          }}
        >
          <option value="">🖍 하이라이트</option>
          <option value="#fde68a">노랑</option>
          <option value="#bbf7d0">민트</option>
          <option value="#bfdbfe">하늘</option>
          <option value="#fbcfe8">핑크</option>
          <option value="#e9d5ff">보라</option>
          <option value="#ffffff">없음</option>
        </select>

        <button
          disabled={isGroupLocked}
          onClick={() => applyDraftFormat("removeFormat")}
          className={
            "ml-auto h-8 px-3 rounded-lg text-[12px] border transition " +
            (isGroupLocked
              ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
              : "border-gray-200 text-gray-700 hover:bg-gray-50")
          }
          title="서식 지우기"
        >
          서식지움
        </button>
      </div>

      <div className="mt-2 text-[11px] text-gray-500">
        현재 그룹: <span className="font-medium text-gray-800">{activeGroup}</span>
      </div>
    </div>

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

      {/* 액션 */}
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


      {/* 메모 리스트 */}
      <div className="flex-1 flex flex-col">
        {currentMemos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-4">
            아직 메모가 없어요.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {currentMemos.map((m) => {
              const contentHtml = m.html || (m.text ? plainToHtml(m.text) : "");
              const color = m.color || getRandomColor();
              const isEditingThis = editingMemoId === m.id && editingMemoGroup === activeGroup;

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className={
                    "relative rounded-xl shadow-md border overflow-hidden cursor-grab active:cursor-grabbing " +
                    (isEditingThis ? "border-amber-500/70 ring-2 ring-amber-300/60" : "border-black/5")
                  }
                  style={{ backgroundColor: color }}
                  draggable
                  onDragStart={(e) => {
                    if (shouldBlockDragStart(e.target)) {
                      e.preventDefault();
                      return;
                    }
                    setDraggingMemoId(m.id);
                  }}
                  onDragEnd={() => {
                    setDraggingMemoId(null);
                    setMemoDragOverGroup(null);
                  }}
                  onContextMenu={(e) => openMemoMenu(e, m.id)}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-b-full bg-white/70 shadow" />

                  {isEditingThis && (
                    <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 text-amber-800">
                      ✏️ 편집중
                    </div>
                  )}

                  <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        value={m.title || ""}
                        onChange={(e) => updateMemoTitle(m.id, e.target.value)}
                        placeholder="제목"
                        disabled={isGroupLocked}
                        className={
                          "w-full text-xs font-semibold text-gray-900 bg-transparent border-b border-white/60 focus:outline-none focus:border-gray-700 pb-0.5 placeholder:text-gray-400 " +
                          (isGroupLocked ? "opacity-60 cursor-not-allowed" : "")
                        }
                      />
                    </div>

                    <div className="flex gap-1 absolute top-1 right-1">
                      <button
                        disabled={isGroupLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGroupLocked) return;
                          loadMemoToDraft(m);
                        }}
                        className={
                          "px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white text-[12px] " +
                          (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
                        }
                        title="메인 편집기에서 서식 편집"
                      >
                        ✏️
                      </button>

                      <button
                        disabled={isGroupLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGroupLocked) return;
                          setColorPickerFor((prev) => (prev === m.id ? null : m.id));
                        }}
                        className={
                          "px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white text-[12px] " +
                          (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
                        }
                        title="색상 변경"
                      >
                        🎨
                      </button>

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

                      <button
                        disabled={isGroupLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGroupLocked) return;
                          removeMemo(m.id);
                        }}
                        className={
                          "px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white " +
                          (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
                        }
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>

                    {colorPickerFor === m.id && (
                      <div className="absolute top-7 right-0 z-20 rounded-xl bg-white shadow-lg border border-gray-200 px-2 py-2 flex flex-wrap gap-1 w-32">
                        {PASTEL_NOTE_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              updateMemoColor(m.id, c);
                              setColorPickerFor(null);
                            }}
                            className="w-5 h-5 rounded-full border border-black/10 focus:outline-none"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 저장된 메모: 서식 그대로 표시 */}
                  <div className="px-3 pb-2">
                    <div
                      className={
                        "text-[11px] leading-relaxed rounded-md px-2 py-2 max-h-40 overflow-y-auto bg-white/30 " +
                        (isGroupLocked ? "opacity-70 cursor-not-allowed" : "")
                      }
                      onContextMenu={(e) => openMemoMenu(e, m.id)}
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </div>

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
                    <span className="text-[10px] text-gray-500">우클릭 메뉴 사용 가능</span>
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

/** HTML -> plain (제목/검사용) */
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

/** plain -> html (fallback 용) */
function plainToHtml(text) {
  const safe = (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safe.replace(/\n/g, "<br/>");
}
