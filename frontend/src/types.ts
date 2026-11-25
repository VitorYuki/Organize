export type Theme = "system" | "light" | "dark";
export type User = { id: number; name: string; theme: Theme } & (
  { is_guest: true; email?: never } | { is_guest?: false; email: string }
);
export type Page =
  "home" | "hoje" | "calendario" | "ajustes" | "notas" | "listas";
export type RecordBase = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};
export type Priority = "low" | "medium" | "high";
export type Task = RecordBase & {
  description: string;
  due_date: string;
  due_time: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
};
export type CalendarEvent = RecordBase & {
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
};
export type Note = RecordBase & { content: string; pinned: boolean };
export type ListItem = RecordBase & { completed: boolean; position: number };
export type PersonalList = RecordBase & {
  icon: string;
  color: string;
  items: ListItem[];
};
export type Records = {
  tasks: Task[];
  events: CalendarEvent[];
  notes: Note[];
  lists: PersonalList[];
};
export type Editor =
  | { kind: "tasks"; record?: Task; date?: string }
  | { kind: "events"; record?: CalendarEvent; date?: string }
  | { kind: "notes"; record?: Note }
  | { kind: "lists"; record?: PersonalList };
export type Save = (
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
) => Promise<void>;
export const priorities: Record<Priority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};
export const colors: Record<string, string> = {
  sage: "Sálvia",
  blue: "Azul",
  amber: "Âmbar",
  rose: "Rosa",
  violet: "Violeta",
  teal: "Verde-petróleo",
};
export const listIcons: Record<string, string> = {
  list: "Lista",
  basket: "Compras",
  book: "Livro",
  film: "Cinema",
  star: "Estrela",
  briefcase: "Trabalho",
  heart: "Coração",
};
