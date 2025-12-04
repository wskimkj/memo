import MemoProvider from "./store/MemoProvider";
import MemoLayout from "./components/memo/MemoLayout";

export default function App() {
  return (
    <MemoProvider>
      <div className="h-screen bg-gray-100">
        <MemoLayout />
      </div>
    </MemoProvider>
  );
}
