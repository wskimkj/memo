import React from "react";
import Header from "./components/Header";
import TodoBoard from "./components/TodoBoard";
import MemoBoard from "./components/MemoBoard";
import useLocalStorage from "./hooks/useLocalStorage";

export default function App(){
  const [todos, setTodos] = useLocalStorage("app_todos_v1", [
    { id: "t1", text: "예시: 환영합니다!", done: false }
  ]);
  const [memos, setMemos] = useLocalStorage("app_memos_v1", { 기본: [] });
  const [activeGroup, setActiveGroup] = useLocalStorage("app_memos_group_v1", "기본");

  const remaining = todos.filter(t => !t.done).length;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        <div>
          <Header remaining={remaining} />
          <TodoBoard todos={todos} setTodos={setTodos} />
        </div>

        <div>
          <MemoBoard memos={memos} setMemos={setMemos} activeGroup={activeGroup} setActiveGroup={setActiveGroup} />
        </div>
      </div>
    </div>
  )
}