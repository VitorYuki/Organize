import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  FilePenLine,
  FileText,
  ListChecks,
  ListPlus,
  Plus,
  Sun,
} from "lucide-react";
import { clock, dateKey, labelDate } from "./dates";
import { Progress, TaskRow } from "./Today";
import { EventRow } from "./Calendar";
import { ListCard, NoteCard } from "./Library";
import { Empty } from "./ui";
import type { Editor, Page, Records, Task, User } from "./types";
const shortcuts = [
  { kind: "tasks", label: "Nova tarefa", Icon: CheckSquare, tint: "sage" },
  { kind: "events", label: "Novo evento", Icon: CalendarPlus, tint: "amber" },
  { kind: "notes", label: "Nova anotação", Icon: FilePenLine, tint: "blue" },
  { kind: "lists", label: "Nova lista", Icon: ListPlus, tint: "violet" },
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
      <ArrowUpRight size={16} />
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
        <div className="overline">
          <Sun size={16} />
          {labelDate(day, { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1>
          {greeting}, <em>{user.name.trim().split(/\s+/)[0] || "você"}.</em>
        </h1>
      </header>
      <div className="home-top">
        <Progress tasks={data.tasks} home />
        <section className="panel shortcuts-panel">
          <div className="section-head">
            <h2>Criação rápida</h2>
            <Plus size={19} />
          </div>
          <div className="shortcuts">
            {shortcuts.map(({ kind, label, Icon, tint }) => (
              <button key={kind} onClick={() => open({ kind })}>
                <span className={"list-icon tint-" + tint}>
                  <Icon size={20} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="home-grid">
        <section className="panel">
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
              title="Tudo em dia"
              body="Suas tarefas de hoje e de alta prioridade aparecem aqui."
            />
          )}
        </section>
        <section className="panel">
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
            <Empty
              icon={CalendarDays}
              title="Agenda livre"
              body="Adicione seu próximo compromisso."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Anotações</h2>
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
            <Empty
              icon={FileText}
              title="Espaço para suas ideias"
              body="Crie uma anotação para encontrá-la aqui."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Minhas listas</h2>
            <ViewAll click={() => go("listas")} label="Ver todas" />
          </div>
          {data.lists.length ? (
            data.lists
              .slice(0, 3)
              .map((l) => (
                <ListCard list={l} open={() => selectList(l.id)} key={l.id} />
              ))
          ) : (
            <Empty
              icon={ClipboardList}
              title="Nenhuma lista ainda"
              body="Crie uma lista e acompanhe seus itens."
            />
          )}
        </section>
      </div>
    </>
  );
}
