import { createContext, useContext, useReducer } from "react";

const MemoStateContext = createContext(null);
const MemoDispatchContext = createContext(null);

const initialState = {
  groups: [],
  memos: [],
  selectedGroupId: null,
  selectedMemoId: null,
};

export default function MemoProvider({ children }) {
  const [state, dispatch] = useReducer(memoReducer, initialState);

  return (
    <MemoStateContext.Provider value={state}>
      <MemoDispatchContext.Provider value={dispatch}>
        {children}
      </MemoDispatchContext.Provider>
    </MemoStateContext.Provider>
  );
}

export function useMemoState() {
  return useContext(MemoStateContext);
}
export function useMemoDispatch() {
  return useContext(MemoDispatchContext);
}

function memoReducer(state, action) {
  switch (action.type) {
    case "ADD_GROUP": {
      const order =
        state.groups.reduce((max, g) => Math.max(max, g.order), 0) + 1;

      const newG = {
        id: crypto.randomUUID(),
        name: action.name,
        order,
        createdAt: Date.now(),
      };

      return {
        ...state,
        groups: [...state.groups, newG],
        selectedGroupId: newG.id,
      };
    }

    case "RENAME_GROUP": {
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, name: action.name } : g
        ),
      };
    }

    case "DELETE_GROUP": {
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.id),
        memos: state.memos.filter((m) => m.groupId !== action.id),
        selectedGroupId:
          state.selectedGroupId === action.id ? null : state.selectedGroupId,
        selectedMemoId: null,
      };
    }

    case "SELECT_GROUP":
      return { ...state, selectedGroupId: action.id, selectedMemoId: null };

    case "ADD_MEMO": {
      const order =
        state.memos
          .filter((m) => m.groupId === action.groupId)
          .reduce((max, m) => Math.max(max, m.order), 0) + 1;

      const newMemo = {
        id: crypto.randomUUID(),
        groupId: action.groupId,
        title: "새 메모",
        content: "",
        pinned: false,
        status: "todo",
        order,
        createdAt: Date.now(),
      };

      return {
        ...state,
        memos: [newMemo, ...state.memos],
        selectedMemoId: newMemo.id,
      };
    }

    case "UPDATE_MEMO": {
      return {
        ...state,
        memos: state.memos.map((m) =>
          m.id === action.id ? { ...m, ...action.patch } : m
        ),
      };
    }

    case "DELETE_MEMO": {
      return {
        ...state,
        memos: state.memos.filter((m) => m.id !== action.id),
        selectedMemoId:
          state.selectedMemoId === action.id ? null : state.selectedMemoId,
      };
    }

    case "SELECT_MEMO":
      return { ...state, selectedMemoId: action.id };

    default:
      return state;
  }
}
