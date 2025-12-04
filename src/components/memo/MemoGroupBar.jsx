import { useMemoDispatch, useMemoState } from "../../store/MemoProvider";

export default function MemoGroupBar() {
  const { groups, selectedGroupId } = useMemoState();
  const dispatch = useMemoDispatch();

  const addGroup = () => {
    const name = prompt("새 그룹명?");
    if (!name) return;
    dispatch({ type: "ADD_GROUP", name });
  };

  const deleteGroup = (id) => {
    if (!confirm("이 그룹과 안의 모든 메모를 삭제할까요?")) return;
    dispatch({ type: "DELETE_GROUP", id });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {groups
          .sort((a, b) => a.order - b.order)
          .map((g) => (
            <div
              key={g.id}
              className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                selectedGroupId === g.id
                  ? "bg-white text-black"
                  : "bg-white/20 text-gray-700"
              }`}
            >
              <button
                onClick={() => dispatch({ type: "SELECT_GROUP", id: g.id })}
              >
                {g.name}
              </button>
              <button
                className="text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteGroup(g.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
      </div>
      <button
        className="px-2 py-1 text-xs border rounded-full bg-white/50"
        onClick={addGroup}
      >
        + 그룹
      </button>
    </div>
  );
}
