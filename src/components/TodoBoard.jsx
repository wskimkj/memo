import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TodoBoard({ todos, setTodos }) {
  const inputRef = useRef();

  function addTodo(text) {
    const t = (text || inputRef.current.value || "").trim();
    if (!t) return;
    setTodos(prev => [{ id: Date.now().toString(), text: t, done: false }, ...prev]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function toggle(id) {
    setTodos(prev => prev.map(p => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  function remove(id) {
    setTodos(prev => prev.filter(p => p.id !== id));
  }

  function move(id, dir) {
    setTodos(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(x => x.id === id);
      if (idx < 0) return prev;
      const [item] = arr.splice(idx, 1);
      const newIdx = Math.max(0, Math.min(arr.length, idx + dir));
      arr.splice(newIdx, 0, item);
      return arr;
    });
  }

  return (
    <section className="glass p-5">
      <div className="flex gap-3 mb-4">
        <input ref={inputRef} className="input flex-1" placeholder="새 할 일 추가 (Enter 또는 추가 버튼)" onKeyDown={(e)=>{ if(e.key==='Enter') addTodo(); }} />
        <button onClick={()=>addTodo()} className="px-4 py-2 rounded-lg text-white" style={{background:'linear-gradient(90deg,#7b5cfa,#a084ff)'}}>추가</button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {todos.map((t, i) => (
            <motion.div key={t.id} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, scale:0.98}} className="flex items-center justify-between p-3 rounded-xl bg-white">
              <div className={"flex-1 " + (t.done ? "line-through text-gray-400" : "")} onClick={()=>toggle(t.id)}>{t.text}</div>
              <div className="flex items-center gap-2">
                <button onClick={()=>move(t.id, -1)} className="text-sm px-2">▲</button>
                <button onClick={()=>move(t.id, +1)} className="text-sm px-2">▼</button>
                <button onClick={()=>remove(t.id)} className="text-sm text-red-500">삭제</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}