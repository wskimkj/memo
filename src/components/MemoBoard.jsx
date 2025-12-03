import React, { useState } from "react";
import { motion } from "framer-motion";

export default function MemoBoard({
  memos,
  setMemos,
  activeGroup,
  setActiveGroup,
  groupsOrder,
  setGroupsOrder
}) {
  const [newGroup, setNewGroup] = useState("");
  const [newMemo, setNewMemo] = useState("");

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

  // 메모 추가
  function addMemo() {
    const m = newMemo.trim();
    if (!m) return;
    const group = activeGroup || groups[0] || "기본";
    setMemos((prev) => {
      const copy = { ...prev };
      if (!copy[group]) copy[group] = [];
      copy[group] = [{ id: Date.now().toString(), text: m }, ...copy[group]];
      return copy;
    });
    setNewMemo("");
  }

  // 메모 삭제
  function removeMemo(id) {
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).filter(
        (x) => x.id !== id
      );
      return copy;
    });
  }

  // 메모 내용 수정
  function editMemo(id) {
    const list = memos[activeGroup] || [];
    const target = list.find((m) => m.id === id);
    if (!target) return;
    const next = window.prompt("메모 수정", target.text);
    if (next == null) return;
    const text = next.trim();
    if (!text) return;
    setMemos((prev) => {
      const copy = { ...prev };
      copy[activeGroup] = (copy[activeGroup] || []).map((m) =>
        m.id === id ? { ...m, text } : m
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

  const currentMemos = memos[activeGroup] || [];

  return (
    <aside className="glass p-5 flex flex-col h-full">
      {/* 상단: 그룹(폴더) 바 */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-600">
            메모 그룹 (폴더)
          </span>
          <span className="text-[11px] text-gray-400">
            폴더를 클릭해 전환하고, 화살표로 순서를 바꿀 수 있어요.
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <div
              key={g}
              className="flex items-center gap-1 shrink-0"
            >
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
                </>
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

      {/* 메모 리스트 */}
      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {currentMemos.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.02 }}
              className="sticky bg-gradient-to-b from-[#fff9e6] to-[#fff6d6] rounded-xl p-3 shadow-md"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div
                  className="text-sm cursor-pointer whitespace-pre-wrap"
                  onDoubleClick={() => editMemo(m.id)}
                  title="더블클릭해서 내용 수정"
                >
                  {m.text}
                </div>
                <button
                  onClick={() => removeMemo(m.id)}
                  className="text-xs text-red-500"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="text-gray-400">
                  그룹:{" "}
                  <span className="font-medium text-gray-700">
                    {activeGroup}
                  </span>
                </div>

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
            </motion.div>
          ))}
        </div>

        <div className="mt-auto flex gap-2">
          <input
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder={
              activeGroup
                ? `"${activeGroup}" 그룹에 메모 추가...`
                : "메모 추가..."
            }
            className="input flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") addMemo();
            }}
          />
          <button
            onClick={addMemo}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow"
            style={{
              background: "linear-gradient(90deg,#7b5cfa,#a084ff)"
            }}
          >
            추가
          </button>
        </div>
      </div>
    </aside>
  );
}
