import MemoGroupBar from "./MemoGroupBar";
import MemoListPanel from "./MemoListPanel";
import MemoEditorPanel from "./MemoEditorPanel";

export default function MemoLayout() {
  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <MemoGroupBar />
      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="w-1/3 min-w-[260px] border rounded-xl p-2 overflow-hidden">
          <MemoListPanel />
        </div>
        <div className="flex-1 border rounded-xl p-3 overflow-hidden">
          <MemoEditorPanel />
        </div>
      </div>
    </div>
  );
}
