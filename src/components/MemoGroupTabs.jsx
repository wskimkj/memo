import "./MemoGroupTabs.css";

export default function MemoGroupTabs({ groups, current, onChange, onAdd, onDelete }) {
  return (
    <div className="memo-tabs">
      {groups.map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`memo-tab ${current === g ? "active" : ""}`}
        >
          {g}
          {g !== "기본" && (
            <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(g); }}>
              ✕
            </span>
          )}
        </button>
      ))}

      <button className="memo-tab add" onClick={onAdd}>＋</button>
    </div>
  );
}
