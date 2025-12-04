import { useState } from "react";

export default function TodoBoard({ todos, setTodos }) {
  const [text, setText] = useState("");

  const addTodo = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newTodo = {
      id: crypto.randomUUID(),
      text,
      done: false,
      date: null,
    };

    setTodos([newTodo, ...todos]);
    setText("");
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      )
    );
  };

  const removeTodo = (id) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">

      {/* 입력바: floating 스타일 */}
      <form onSubmit={addTodo} className="relative">
        <input
          type="text"
          value={text}
          placeholder="할 일을 입력하세요..."
          onChange={(e) => setText(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
        />

        {text.length > 0 && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm px-3 py-1 
                       bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            추가
          </button>
        )}
      </form>

      {/* 리스트 */}
      <div className="space-y-2">
        {todos.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">
            아직 할 일이 없어요 ✨
          </p>
        )}

        {todos.map((t) => (
          <div
            key={t.id}
            className="group flex items-center justify-between p-3 bg-white/80 rounded-xl border border-gray-200
                       shadow-sm hover:shadow-md transition cursor-pointer"
          >
            {/* 왼쪽: 체크 + 텍스트 */}
            <div
              className="flex items-center gap-3 flex-1"
              onClick={() => toggleTodo(t.id)}
            >
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition
                  ${
                    t.done
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-300 bg-white"
                  }`}
              >
                {t.done && "✓"}
              </div>

              <span
                className={`text-sm transition ${
                  t.done ? "line-through text-gray-400" : "text-gray-800"
                }`}
              >
                {t.text}
              </span>
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={() => removeTodo(t.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
