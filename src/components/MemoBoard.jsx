import { useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import MemoGroupTabs from "./MemoGroupTabs";
import "./MemoBoard.css";

export default function MemoBoard() {
  const [groups, setGroups] = useLocalStorage("memoGroups", ["기본"]);
  const [currentGroup, setCurrentGroup] = useLocalStorage("currentMemoGroup", "기본");
  const [memos, setMemos] = useLocalStorage("memoData", { 기본: "" });

  const currentText = memos[currentGroup] || "";

  const handleChange = (value) => {
    setMemos({ ...memos, [currentGroup]: value });
  };

  const addGroup = () => {
    const name = prompt("새 그룹 이름?");
    if (!name) return;
    if (groups.includes(name)) return alert("이미 존재합니다.");
    setGroups([...groups, name]);
    setMemos({ ...memos, [name]: "" });
  };

  const deleteGroup = (g) => {
    if (!confirm("정말 삭제할까요?")) return;
    const newGroups = groups.filter(x => x !== g);
    const newMemoData = { ...memos };
    delete newMemoData[g];

    setGroups(newGroups);
    setMemos(newMemoData);

    if (currentGroup === g) setCurrentGroup("기본");
  };

  return (
    <div className="memo-container">
      <MemoGroupTabs
        groups={groups}
        current={currentGroup}
        onChange={setCurrentGroup}
        onAdd={addGroup}
        onDelete={deleteGroup}
      />

      <textarea
        className="memo-textarea"
        value={currentText}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="여기에 메모를 입력하세요..."
      />
    </div>
  );
}
