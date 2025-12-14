export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type RepeatRule = {
  type: RepeatType;
  interval: number;
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

  important: boolean;
  myDay: boolean;
  notes: string;
  steps: TodoStep[];

  dueDate: string | null;     // YYYY-MM-DD
  reminderAt: string | null;  // YYYY-MM-DDTHH:mm
  repeat: RepeatRule | null;

  createdAt: number;
  updatedAt: number;
};
