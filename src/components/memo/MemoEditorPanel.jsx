import { useMemoDispatch, useMemoState } from "../../store/MemoProvider";

export default function MemoEditorPanel() {
  const { memos, selectedMemoId } = useMemoState();
  const dispatch = useMemoDispatch();

  const memo = memos.find((m) => m.id === selectedMemoId);

  if (!memo)
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        메모를 선택하세요
      </div>
    );

  const update = (patch) =>
    dispatch({ type: "UPDATE_MEMO", id: memo.id, patch });

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 text-lg font-semibold border-b"
          value={memo.title}
          onChange={(e) => update({ title: e.target.value })}
        />

        <button onClick={() => update({ pinned: !memo.pinned })}>
          {memo.pinned ? "📌 해제" : "📌 고정"}
        </button>

        <button
          className="text-red-500 text-sm"
          onClick={() => dispatch({ type: "DELETE_MEMO", id: memo.id })}
        >
          삭제
        </button>
      </div>

      <textarea
        className="flex-1 w-full p-2 border rounded resize-none"
        value={memo.content}
        onChange={(e) => update({ content: e.target.value })}
      />
    </div>
  );
}
