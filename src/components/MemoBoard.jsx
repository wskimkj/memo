import React, { useState } from "react";
import { motion } from "framer-motion";

export default function MemoBoard({ memos, setMemos, activeGroup, setActiveGroup }) {
  const [newGroup, setNewGroup] = useState("");
  const [newMemo, setNewMemo] = useState("");

  const groups = Object.keys(memos);

  function createGroup() {
    const g = newGroup.trim();
    if (!g) return;
    setMemos(prev => ({ ...prev, [g]: [] }));
    setActiveGroup(g);
    setNewGroup("");
  }

  function addMemo() {
    const m = newMemo.trim();
    if (!m) return;
    setMemos(prev => {
      const copy = { ...prev };
      if (!copy[activeGroup]) copy[activeGroup] = [];
      copy[activeGroup] = [{ id: Date.now().toString(), text: m }, ...copy[activeGroup]];
      return copy;
    });
    setNewMemo("");
  }

  function removeMemo(id) {
    setMemos(prev => {
      const copy = { ...prev };
      copy[activeGroup] = copy[activeGroup].filter(x => x.id !== id);
      return copy;
    });
  }

  return (
    <aside className="glass p-5">
      <div className="flex gap-2 items-center mb-3">
        {groups.map(g => (
          <button key={g} onClick={()=>setActiveGroup(g)} className={`px-3 py-1 rounded-full text-sm ${activeGroup===g ? 'bg-gradient-to-r from-[#7b5cfa] to-[#a084ff] text-white':''}`}>
            {g}
          </button>
        ))}
        <input value={newGroup} onChange={(e)=>setNewGroup(e.target.value)} placeholder="새 그룹" className="input px-2 py-1 w-28" />
        <button onClick={createGroup} className="px-2 py-1 rounded-md" style={{background:'#f3f3f8'}}>추가</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {(memos[activeGroup] || []).map(m => (
          <motion.div key={m.id} whileHover={{ scale: 1.02 }} className="sticky">
            <div className="flex justify-between items-start gap-2">
              <div className="text-sm">{m.text}</div>
              <button onClick={() => removeMemo(m.id)} className="text-xs text-red-500">×</button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={newMemo} onChange={(e)=>setNewMemo(e.target.value)} placeholder="메모 추가..." className="input flex-1" />
        <button onClick={addMemo} className="px-4 py-2 rounded-lg text-white" style={{background:'linear-gradient(90deg,#7b5cfa,#a084ff)'}}>추가</button>
      </div>
    </aside>
  );
}