import React from "react";
import Header from "./components/Header";
import TodoBoard from "./components/TodoBoard";
import MemoBoard from "./components/MemoBoard";
import useLocalStorage from "./hooks/useLocalStorage";

export default function App() {
  // ✅ 할 일: 날짜(date) 필드를 포함
  const [todos, setTodos] = useLocalStorage("app_todos_v1", [
    { id: "t1", text: "예시: 환영합니다!", done: false, date: null },
  ]);

  // ✅ 메모: 그룹별 객체 구조
  const [memos, setMemos] = useLocalStorage("app_memos_v1", { 기본: [] });
  const [activeGroup, setActiveGroup] = useLocalStorage(
    "app_memos_group_v1",
    "기본"
  );

  // ✅ 메모 그룹(폴더) 순서
  const [memoGroups, setMemoGroups] = useLocalStorage(
    "app_memos_groups_order_v1",
    ["기본"]
  );

  const remaining = todos.filter((t) => !t.done).length;
  const total = todos.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f9fbff,_#ebeef5)] px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_320px] gap-6 lg:gap-8">
        {/* 메모: 메인 전체 화면 */}
        <section className="glass-strong rounded-3xl px-4 py-4 md:px-6 md:py-5 flex flex-col h-full shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <MemoBoard
            memos={memos}
            setMemos={setMemos}
            activeGroup={activeGroup}
            setActiveGroup={setActiveGroup}
            groupsOrder={memoGroups}
            setGroupsOrder={setMemoGroups}
          />
        </section>

        {/* Todo: 오른쪽 사이드바 */}
        <aside className="flex flex-col gap-4 lg:gap-5 lg:sticky lg:top-8 h-fit">
          <div className="glass-light rounded-3xl px-4 py-3 md:px-5 md:py-4 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
            <Header remaining={remaining} total={total} />
          </div>

          <div className="glass-light rounded-3xl px-4 py-3 md:px-5 md:py-4 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
            <TodoBoard todos={todos} setTodos={setTodos} />
          </div>
        </aside>
      </div>
    </div>
  );
}
