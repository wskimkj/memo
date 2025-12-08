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
  const allMemoGroups = Object.keys(memos || {});
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
          <h2 className="text-sm font-semibold text-gray-800">메모 보드</h2>
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

              {/* Fragment 대신 div 사용해서 에러 방지 */}
              {activeGroup === g && (
                <div className="flex items-center gap-0.5">
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

      {/* 상단: 스티커 메모 입력 카드 */}
      <div className="mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#fef3c7]/80 via-white/95 to-white/95 border border-amber-100/80 shadow-[0_18px_40px_rgba(251,191,36,0.18)]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(250,250,249,1)]" />
              <span className="text-xs font-medium text-amber-900">새 메모</span>
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
            data-placeholder="여기에 새 메모를 자유롭게 적어보세요. URL을 붙여넣거나, 이미지 URL을 추가할 수 있어요."
            onInput={(e) => setDraftHtml(e.currentTarget.innerHTML)}
          />

          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[11px] text-amber-500">
              엔터로 줄바꿈, 위 툴바로 서식·링크·이미지를 넣을 수 있어요.
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

      {/* 메모 리스트 */}
      <div className="flex-1 flex flex-col">
        {currentMemos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            아직 이 그룹에는 메모가 없어요. 위에서 새 메모를 만들어보세요 ✨
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {currentMemos.map((m) => {
              const contentHtml =
                m.html || (m.text ? m.text.replace(/\n/g, "<br />") : "");
              return (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className="relative bg-gradient-to-b from-[#fef9c3] via-[#fffbeb] to-[#fef3c7] rounded-2xl p-3 shadow-[0_16px_30px_rgba(251,191,36,0.35)] border border-amber-100"
                >
                  {/* 상단 핀 느낌 점 */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(254,252,232,1)]" />

                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex-1">
                      <div
                        className="text-sm whitespace-pre-wrap leading-relaxed focus:outline-none"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          updateMemoHtml(m.id, e.currentTarget.innerHTML)
                        }
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                      />
                    </div>

                    <button
                      onClick={() => removeMemo(m.id)}
                      className="ml-1 text-xs text-amber-500 hover:text-red-500"
                      title="메모 삭제"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 text-amber-800/80">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100/90 border border-amber-200/80">
                        그룹:{" "}
                        <span className="font-medium">{activeGroup}</span>
                      </span>
                      {m.createdAt && (
                        <span className="text-[10px] text-amber-500">
                          {new Date(m.createdAt).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyMemo(m)}
                        className="px-2 py-1 rounded-full text-[11px] bg-white/70 border border-amber-200 hover:bg-white"
                      >
                        복사
                      </button>
                      <button
                        onClick={() => cutMemo(m)}
                        className="px-2 py-1 rounded-full text-[11px] bg-white/70 border border-amber-200 hover:bg-white text-amber-600"
                      >
                        잘라내기
                      </button>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          moveMemoToGroup(m.id, e.target.value);
                          e.target.value = "";
                        }}
                        className="border border-amber-200 rounded-full px-2 py-1 bg-white/80 text-[11px]"
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
