import React, { useEffect, useMemo, useRef, useState } from "react";
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

  // ✅ 그룹 색상 오버라이드 + 잠금(읽기전용)
  const [groupColorOverrides, setGroupColorOverrides] = useState({});
  const [lockedGroups, setLockedGroups] = useState({}); // { [group]: true }

  // ✅ 그룹 우클릭 메뉴 (탭 근처)
  const [groupMenu, setGroupMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    group: null,
  });

  // ✅ 메모 우클릭 메뉴 (메모 근처)
  const [memoMenu, setMemoMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    memoId: null,
  });

  // ✅ 메모 본문 툴바 표시용 (포커스된 메모)
  const [activeMemoEditorId, setActiveMemoEditorId] = useState(null);
  const activeMemoEditorRef = useRef(null);

  const draftEditorRef = useRef(null);

  // 실제 그룹 목록 = 저장된 순서 + memos 키들의 합집합
  const allMemoGroups = Object.keys(memos || {});
  const groups = useMemo(
    () => Array.from(new Set([...(groupsOrder || []), ...allMemoGroups])),
    [groupsOrder, allMemoGroups.join("|")]
  );

  const currentMemos = memos[activeGroup] || [];
  const isGroupLocked = !!lockedGroups[activeGroup];

  // 파스텔 컬러 하나 뽑기
  function getRandomColor() {
    const idx = Math.floor(Math.random() * PASTEL_NOTE_COLORS.length);
    return PASTEL_NOTE_COLORS[idx];
  }

  // ✅ 공통 서식 적용 (포커스된 contentEditable에 적용)
  function applyFormat(command, value) {
    document.execCommand(command, false, value ?? null);
  }

  function handleInsertLink() {
    const url = window.prompt("링크 URL을 입력하세요");
    if (url) applyFormat("createLink", url);
  }

  function handleInsertImage() {
    const url = window.prompt("이미지 URL을 입력하세요");
    if (url) applyFormat("insertImage", url);
  }

  function insertCheckboxList() {
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
    applyFormat("insertHTML", html);
  }

  function insertTable() {
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
    applyFormat("insertHTML", html);
  }

  // ✅ 메뉴 닫기(바깥 클릭/스크롤/리사이즈)
  useEffect(() => {
    const closeAll = () => {
      setGroupMenu({ open: false, x: 0, y: 0, group: null });
      setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
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

      if (copy[newName]) copy[newName] = [...oldList, ...copy[newName]];
      else copy[newName] = oldList;

      return copy;
    });

    setGroupsOrder((prev) =>
      (prev || []).map((g) => (g === oldName ? newName : g))
    );

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

    if (clipboardMemo.mode === "cut") setClipboardMemo(null);
  }

  // 새 메모 추가
  function addMemo() {
    if (isGroupLocked) return;
    const html = (draftHtml || "").trim();
    const plain = stripHtml(html);
    if (!plain) return;
    const group = activeGroup || groups[0] || "기본";
    const firstLine = plain.split("\n")[0] || "";
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
    if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
  }

  function clearDraft() {
    if (isGroupLocked) return;
    setDraftHtml("");
    if (draftEditorRef.current) draftEditorRef.current.innerHTML = "";
  }

  // ✅ 그룹 복제(그룹 + 메모들 복사)
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

  // ✅ 그룹 탭 색상 설정
  function setGroupColor(groupName, color) {
    setGroupColorOverrides((prev) => ({ ...prev, [groupName]: color }));
  }

  // ✅ 그룹 이동(위/아래)
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

  // ✅ 섹션 링크 복사
  async function copySectionLink(name) {
    const url =
      window.location.origin +
      window.location.pathname +
      `?group=${encodeURIComponent(name)}`;

    try {
      await navigator.clipboard.writeText(url);
      window.alert("섹션 링크를 복사했어요!");
    } catch {
      window.prompt("복사 실패! 아래 링크를 수동 복사하세요:", url);
    }
  }

  // ✅ 그룹 잠금(읽기전용)
  function toggleGroupLock(name) {
    setLockedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  // ✅ 그룹 우클릭 메뉴 열기 (탭 근처에)
  function openGroupMenu(e, groupName) {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 260);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 360);

    setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
    setGroupMenu({ open: true, x, y, group: groupName });
  }

  // ✅ 메모 우클릭 메뉴 열기 (메모 근처에)
  function openMemoMenu(e, memoId) {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.right - 240, window.innerWidth - 260);
    const y = Math.min(rect.top + 18, window.innerHeight - 360);

    setGroupMenu({ open: false, x: 0, y: 0, group: null });
    setMemoMenu({ open: true, x, y, memoId });
  }

  // 메모 찾기
  const memoById = useMemo(() => {
    const map = new Map();
    for (const m of currentMemos) map.set(m.id, m);
    return map;
  }, [currentMemos]);

  const memoMenuTarget = memoMenu.memoId ? memoById.get(memoMenu.memoId) : null;

  return (
    <aside className="glass p-5 flex flex-col h-full">
      {/* 상단 타이틀 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">메모 보드</h2>
          <p className="text-[14px] text-gray-400"></p>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          <div>
            현재 그룹:{" "}
            <span className="font-medium text-gray-700">{activeGroup}</span>
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

      {/* 그룹 탭 바 (원노트 스타일) */}
      <div className="mb-4">
        <div className="relative">
          {/* 탭 아래 하얀 바 */}
          <div className="h-7 bg-white/90 rounded-t-md border border-gray-200 border-b-0" />

          {/* 탭들 */}
          <div className="absolute left-2 top-0 flex items-end gap-1 pr-14">
            {groups.map((g) => {
              const active = g === activeGroup;
              const color = groupColorOverrides[g] || getGroupColor(g);

              return (
                <div
                  key={g}
                  className={
                    "group relative flex items-center " +
                    (memoDragOverGroup === g ? "drop-shadow-md" : "")
                  }
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
                        (active
                          ? "font-semibold text-gray-900"
                          : "text-gray-600 hover:-translate-y-[1px]")
                      }
                      style={{
                        backgroundColor: color,
                        marginBottom: active ? 0 : 1,
                      }}
                      title="우클릭: 이동/링크복사/잠금/색/이름/삭제"
                    >
                      {g}
                      {lockedGroups[g] && <span className="ml-1">🔒</span>}
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

      {/* ✅ 그룹 우클릭 메뉴 */}
      {groupMenu.open && (
        <div
          className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ left: groupMenu.x, top: groupMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">
            그룹:{" "}
            <span className="font-medium text-gray-800">{groupMenu.group}</span>
            {lockedGroups[groupMenu.group] && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                🔒 읽기전용
              </span>
            )}
          </div>

          {/* 이동 */}
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
            {lockedGroups[groupMenu.group]
              ? "🔓 잠금 해제"
              : "🔒 그룹 잠금(읽기전용)"}
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

          {/* 탭 색상 */}
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
                  title={c}
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

      {/* ✅ 메모 우클릭 메뉴 */}
      {memoMenu.open && memoMenuTarget && (
        <div
          className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ left: memoMenu.x, top: memoMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">
            메모:{" "}
            <span className="font-medium text-gray-800">
              {memoMenuTarget.title || "제목 없음"}
            </span>
          </div>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              copyMemo(memoMenuTarget);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            📄 복사
          </button>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
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

          {/* 메모 색 */}
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

          {/* 다른 그룹으로 이동 */}
          <div className="px-3 py-2 border-t">
            <div className="text-[11px] text-gray-500 mb-2">다른 그룹으로 이동</div>
            <div className="flex flex-wrap gap-1">
              {groups
                .filter((g) => g !== activeGroup)
                .slice(0, 8)
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
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 border-t"
            onClick={() => {
              removeMemo(memoMenuTarget.id);
              setMemoMenu({ open: false, x: 0, y: 0, memoId: null });
            }}
          >
            🗑 메모 삭제
          </button>
        </div>
      )}

      {/* 상단: 새 메모 입력 카드 */}
      <div className="mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#fef3c7]/80 via-white/95 to-white/95 border border-amber-100/80 shadow-[0_18px_40px_rgba(251,191,36,0.18)]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(250,250,249,1)]" />
              <span className="text-xs font-medium text-amber-900">
                새 메모
              </span>
              {isGroupLocked && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  🔒 읽기전용(추가 불가)
                </span>
              )}
            </div>
            <button
              onClick={clearDraft}
              disabled={isGroupLocked}
              className={
                "text-[11px] " +
                (isGroupLocked
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-amber-500 hover:text-amber-700")
              }
            >
              비우기
            </button>
          </div>

          {/* 새 메모 툴바 */}
          <div className="flex items-center gap-1 px-4 pb-2 border-t border-b border-amber-100/80 text-[11px] text-amber-800/80">
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("bold")}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 font-semibold " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
            >
              B
            </button>
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("italic")}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 italic " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
            >
              I
            </button>
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("underline")}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 underline " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
            >
              U
            </button>
            <span className="mx-1 h-4 w-px bg-amber-200/80" />
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("insertUnorderedList")}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
            >
              • 목록
            </button>
            <span className="mx-1 h-4 w-px bg-amber-200/80" />
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertLink}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
            >
              링크
            </button>
            <button
              type="button"
              disabled={isGroupLocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertImage}
              className={
                "px-2 py-1 rounded-md hover:bg-amber-100/80 " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
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
            className={
              "min-h-[110px] max-h-64 overflow-y-auto px-4 pb-3 pt-2 text-sm leading-relaxed text-gray-800 outline-none " +
              (isGroupLocked ? "opacity-60 cursor-not-allowed" : "")
            }
            contentEditable={!isGroupLocked}
            data-placeholder="자유롭게 적어보세요."
            onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
          />

          <div className="flex items-center justify-between px-4 pb-3">
            <button
              onClick={addMemo}
              disabled={isGroupLocked}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-md hover:shadow-lg transition-shadow " +
                (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
              }
              style={{
                background: "linear-gradient(90deg,#f97316,#fbbf24)",
              }}
            >
              메모 추가
            </button>
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
              const contentHtml =
                m.html || (m.text ? m.text.replace(/\n/g, "<br />") : "");
              const color = m.color || getRandomColor();

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className="relative rounded-xl shadow-md border border-black/5 overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{ backgroundColor: color }}
                  draggable
                  onDragStart={() => setDraggingMemoId(m.id)}
                  onDragEnd={() => {
                    setDraggingMemoId(null);
                    setMemoDragOverGroup(null);
                  }}
                  onContextMenu={(e) => openMemoMenu(e, m.id)} // ✅ 메모 우클릭
                >
                  {/* 상단 테이프 느낌 */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-b-full bg-white/70 shadow" />

                  {/* 카드 상단: 제목 + 액션 */}
                  <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        value={m.title || ""}
                        onChange={(e) => updateMemoTitle(m.id, e.target.value)}
                        placeholder="제목"
                        disabled={isGroupLocked}
                        className={
                          "w-full text-xs font-semibold text-gray-900 bg-transparent border-b border-white/60 focus:outline-none focus:border-gray-700 pb-0.5 placeholder:text-gray-400 " +
                          (isGroupLocked
                            ? "opacity-60 cursor-not-allowed"
                            : "")
                        }
                      />
                    </div>

                    <div className="flex gap-1 absolute top-1 right-1">
                      {/* 🎨 색상 선택 */}
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
                        disabled={isGroupLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGroupLocked) return;
                          cutMemo(m);
                        }}
                        className={
                          "px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 hover:bg-white " +
                          (isGroupLocked ? "opacity-40 cursor-not-allowed" : "")
                        }
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

                  {/* ✅ 메모 본문 툴바 (포커스된 메모만 표시) */}
                  {activeMemoEditorId === m.id && !isGroupLocked && (
                    <div
                      className="mx-3 mb-2 rounded-lg border border-white/50 bg-white/40 px-2 py-1 flex flex-wrap items-center gap-1 text-[11px] text-gray-700"
                      onMouseDown={(e) => e.preventDefault()} // 포커스 유지
                    >
                      {/* 폰트 */}
                      <select
                        className="px-2 py-1 rounded bg-white/60 border"
                        defaultValue="Pretendard"
                        onChange={(e) => applyFormat("fontName", e.target.value)}
                        title="폰트"
                      >
                        <option value="Pretendard">Pretendard</option>
                        <option value="Arial">Arial</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Times New Roman">Times</option>
                      </select>

                      {/* 크기(1~7) */}
                      <select
                        className="px-2 py-1 rounded bg-white/60 border"
                        defaultValue="3"
                        onChange={(e) => applyFormat("fontSize", e.target.value)}
                        title="크기"
                      >
                        <option value="1">XS</option>
                        <option value="2">S</option>
                        <option value="3">M</option>
                        <option value="4">L</option>
                        <option value="5">XL</option>
                        <option value="6">2XL</option>
                        <option value="7">3XL</option>
                      </select>

                      <span className="mx-1 h-4 w-px bg-white/60" />

                      <button
                        className="px-2 py-1 rounded hover:bg-white/60 font-semibold"
                        onClick={() => applyFormat("bold")}
                      >
                        B
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60 italic"
                        onClick={() => applyFormat("italic")}
                      >
                        I
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60 underline"
                        onClick={() => applyFormat("underline")}
                      >
                        U
                      </button>

                      <span className="mx-1 h-4 w-px bg-white/60" />

                      {/* 정렬 */}
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("justifyLeft")}
                        title="왼쪽 정렬"
                      >
                        ⟸
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("justifyCenter")}
                        title="가운데 정렬"
                      >
                        ≡
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("justifyRight")}
                        title="오른쪽 정렬"
                      >
                        ⟹
                      </button>

                      <span className="mx-1 h-4 w-px bg-white/60" />

                      {/* 목록 */}
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("insertUnorderedList")}
                        title="글머리"
                      >
                        •
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("insertOrderedList")}
                        title="번호"
                      >
                        1.
                      </button>

                      {/* 체크박스 */}
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={insertCheckboxList}
                        title="체크박스 리스트"
                      >
                        ☑︎
                      </button>

                      {/* 표 */}
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={insertTable}
                        title="표 삽입"
                      >
                        ▦
                      </button>

                      <span className="mx-1 h-4 w-px bg-white/60" />

                      {/* 링크/이미지 */}
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={handleInsertLink}
                        title="링크"
                      >
                        🔗
                      </button>
                      <button
                        className="px-2 py-1 rounded hover:bg-white/60"
                        onClick={handleInsertImage}
                        title="이미지"
                      >
                        🖼
                      </button>

                      {/* 하이라이트 */}
                      <select
                        className="px-2 py-1 rounded bg-white/60 border"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          applyFormat("hiliteColor", v);
                          applyFormat("backColor", v);
                          e.target.value = "";
                        }}
                        title="하이라이트"
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
                        className="ml-auto px-2 py-1 rounded hover:bg-white/60"
                        onClick={() => applyFormat("removeFormat")}
                        title="서식 지우기"
                      >
                        서식지움
                      </button>
                    </div>
                  )}

                  {/* 본문 영역 */}
                  <div className="px-3 pb-2">
                    <div
                      className={
                        "text-[9px] whitespace-pre-wrap leading-relaxed focus:outline-none rounded-md px-2 py-2 max-h-40 overflow-y-auto bg-white/30 " +
                        (isGroupLocked ? "opacity-70 cursor-not-allowed" : "")
                      }
                      contentEditable={!isGroupLocked}
                      suppressContentEditableWarning
                      onFocus={(e) => {
                        if (isGroupLocked) return;
                        setActiveMemoEditorId(m.id);
                        activeMemoEditorRef.current = e.currentTarget;
                      }}
                      onBlur={(e) => {
                        if (isGroupLocked) return;
                        updateMemoHtml(m.id, e.currentTarget.innerHTML);
                        setActiveMemoEditorId((prev) => (prev === m.id ? null : prev));
                      }}
                      onContextMenu={(e) => openMemoMenu(e, m.id)} // ✅ 본문에서도 우클릭
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </div>

                  {/* 하단 메타 */}
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
                    <span className="text-[10px] text-gray-500">
                      우클릭 메뉴 사용 가능
                    </span>
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
