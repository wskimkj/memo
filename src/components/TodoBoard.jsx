export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type RepeatRule = {
  type: RepeatType;
  interval: number; // 1 = 매일/매주...
};

export type TodoStep = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

export type Todo = {
  id: string;
  text: string;
  done: boolean;

  // MS To Do-ish
  important: boolean;
  myDay: boolean;
  notes: string;
  steps: TodoStep[];

  dueDate: string | null;      // YYYY-MM-DD
  reminderAt: string | null;   // YYYY-MM-DDTHH:mm
  repeat: RepeatRule | null;

  createdAt: number;
  updatedAt: number;
};
