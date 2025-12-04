import { useMemoDispatch, useMemoState } from "../../store/MemoProvider";

export default function MemoListPanel() {
  const { memos, selectedGroupId, selectedMemoId } = useMemoState();
  const dispatch = useMemoDispatch();

  if (!selectedGroupId)
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        그룹을 먼저 선택하세요
      </div>
    );

  const list = memos
    .filter((m) => m.groupId === selectedGroupId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.order - b.order;
    });

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-gray-500">메모 {list.length}개</span>
        <button
          className="px-2 py-1 text-xs border rounded bg-white/50"
          onClick={() =>
            dispatch({ type: "ADD_MEMO", groupId: selectedGroupId })
          }
        >
          + 메모
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {list.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded-lg border cursor-pointer bg-white/60 ${
              selectedMemoId === m.id ? "border-blue-400" : "border-gray-200"
            }`}
          >
            <div
              onClick={() => dispatch({ type: "SELECT_MEMO", id: m.id })}
            >
              <div className="flex justify-between">
                <span className="font-medium">{m.title}</span>
                {m.pinned && <span>📌</span>}
              </div>
              <div className="text-xs text-gray-500 line-clamp-2">
                {m.content || "내용 없음"}
              </div>
            </div>

            <button
              className="text-xs mt-1 text-red-500"
              onClick={() =>
                dispatch({ type: "DELETE_MEMO", id: m.id })
              }
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
