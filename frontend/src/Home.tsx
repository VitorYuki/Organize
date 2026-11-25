import {
  ChevronRight,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  FilePenLine,
  FileText,
  ListChecks,
  ListPlus,
} from "lucide-react";
import { clock, dateKey, labelDate } from "./dates";
import { Progress, TaskRow } from "./Today";
import { EventRow } from "./Calendar";
import { ListCard, NoteCard } from "./Library";
import { Empty } from "./ui";
import type { Editor, Page, Records, Task, User } from "./types";
const shortcuts = [
  { kind: "tasks", label: "Nova tarefa", Icon: CheckSquare },
  { kind: "events", label: "Novo evento", Icon: CalendarPlus },
  { kind: "notes", label: "Nova anotação", Icon: FilePenLine },
  { kind: "lists", label: "Nova lista", Icon: ListPlus },
] as const;
function ViewAll({
  click,
  label = "Ver tudo",
}: {
  click: () => void;
  label?: string;
}) {
  return (
    <button className="section-link" onClick={click}>
      {label}
      <ChevronRight size={16} />
    </button>
  );
}
export function Home({
  user,
  data,
  open,
  go,
  toggle,
  selectList,
}: {
  user: User;
  data: Records;
  open: (e: Editor) => void;
  go: (p: Page) => void;
  toggle: (t: Task) => void;
  selectList: (id: number) => void;
}) {
  const day = dateKey(),
    hour = Number(clock(new Date()).slice(0, 2)),
    greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const agenda = data.events
    .filter((e) => Date.parse(e.ends_at) > Date.now())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, 3);
  const focus = data.tasks
    .filter((t) => !t.completed && (t.due_date <= day || t.priority === "high"))
    .sort(
      (a, b) =>
        a.due_date.localeCompare(b.due_date) ||
        Number(b.priority === "high") - Number(a.priority === "high"),
    )
    .slice(0, 4);
  return (
    <>
      <header className="home-head">
        <p className="page-date">
          {labelDate(day, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1>
          {greeting}, {user.name.trim().split(/\s+/)[0] || "você"}.
        </h1>
      </header>
      <div className="home-layout">
        <div className="home-overview">
          <Progress tasks={data.tasks} />
          <section className="panel">
            <div className="section-head">
              <h2>Criação rápida</h2>
            </div>
            <div className="shortcuts">
              {shortcuts.map(({ kind, label, Icon }) => (
                <button key={kind} onClick={() => open({ kind })}>
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <section className="panel home-focus">
          <div className="section-head">
            <h2>Tarefas em foco</h2>
            <ViewAll click={() => go("hoje")} />
          </div>
          {focus.length ? (
            focus.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                edit={() => open({ kind: "tasks", record: t })}
                toggle={() => toggle(t)}
              />
            ))
          ) : (
            <Empty
              icon={ListChecks}
              title="Nenhuma tarefa em foco"
              body="Tarefas pendentes de hoje, atrasadas ou de alta prioridade aparecem aqui."
            />
          )}
        </section>
        <section className="panel home-agenda">
          <div className="section-head">
            <h2>Próximos eventos</h2>
            <ViewAll click={() => go("calendario")} />
          </div>
          {agenda.length ? (
            agenda.map((e) => (
              <EventRow
                event={e}
                key={e.id}
                open={() => open({ kind: "events", record: e })}
              />
            ))
          ) : (
            <Empty icon={CalendarDays} title="Nenhum evento próximo" />
          )}
        </section>
        <section
          className="panel home-library"
          aria-labelledby="home-notes-title"
        >
          <div className="section-head">
            <h2 id="home-notes-title">Anotações</h2>
            <ViewAll click={() => go("notas")} label="Ver todas" />
          </div>
          {data.notes.length ? (
            <div className="home-notes">
              {data.notes.slice(0, 2).map((n) => (
                <NoteCard
                  note={n}
                  open={() => open({ kind: "notes", record: n })}
                  key={n.id}
                />
              ))}
            </div>
          ) : (
            <Empty icon={FileText} title="Nenhuma anotação" />
          )}
        </section>
        <section
          className="panel home-lists"
          aria-labelledby="home-lists-title"
        >
          <div className="section-head">
            <h2 id="home-lists-title">Minhas listas</h2>
            <ViewAll click={() => go("listas")} label="Ver todas" />
          </div>
          {data.lists.length ? (
            data.lists
              .slice(0, 3)
              .map((l) => (
                <ListCard list={l} open={() => selectList(l.id)} key={l.id} />
              ))
          ) : (
            <Empty icon={ClipboardList} title="Nenhuma lista" />
          )}
        </section>
      </div>
    </>
  );
}
