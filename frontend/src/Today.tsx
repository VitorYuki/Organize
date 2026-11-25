import { useState } from "react";
import {
  Check,
  ChevronRight,
  Flag,
  ListChecks,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { dateKey, labelDate } from "./dates";
import { Empty, Header } from "./ui";
import { priorities, type Task, type Editor } from "./types";
export function TaskRow({
  task,
  edit,
  toggle,
}: {
  task: Task;
  edit: () => void;
  toggle: () => void;
}) {
  return (
    <div className={"task-row " + (task.completed ? "is-done" : "")}>
      <label className="checkbox-hit">
        <input
          type="checkbox"
          aria-label={(task.completed ? "Reabrir " : "Concluir ") + task.title}
          checked={task.completed}
          onChange={toggle}
        />
        <span>{task.completed && <Check size={14} />}</span>
      </label>
      <button className="row-main" onClick={edit}>
        <strong>{task.title}</strong>
        <small>
          {[labelDate(task.due_date), task.due_time?.slice(0, 5), task.category]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </button>
      <span className={"priority " + task.priority}>
        <Flag size={12} />
        {priorities[task.priority]}
      </span>
    </div>
  );
}
export function Progress({ tasks }: { tasks: Task[] }) {
  const today = dateKey(),
    daily = tasks.filter((t) => t.due_date === today),
    done = daily.filter((t) => t.completed).length,
    pct = daily.length ? Math.round((done / daily.length) * 100) : 0;
  return (
    <section className="progress-card">
      <div>
        <h2>Progresso diário</h2>
        <p>
          {daily.length
            ? `${done} de ${daily.length} concluídas`
            : "Nenhuma tarefa para hoje"}
        </p>
      </div>
      <div
        className="progress-meter"
        role="progressbar"
        aria-label="Progresso diário"
        aria-valuenow={pct}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" />
          <circle
            cx="24"
            cy="24"
            r="20"
            pathLength="100"
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        <span aria-hidden="true">{pct}%</span>
      </div>
    </section>
  );
}
type TodayProps = {
  tasks: Task[];
  open: (e: Editor) => void;
  toggle: (t: Task) => void;
};
export function Today({ tasks, open, toggle }: TodayProps) {
  const today = dateKey(),
    [period, setPeriod] = useState("today"),
    [order, setOrder] = useState("date"),
    [status, setStatus] = useState("all"),
    [priority, setPriority] = useState("all"),
    [filters, setFilters] = useState(false);
  const visible = tasks
    .filter(
      (t) =>
        (period === "all" ||
          (period === "today" && t.due_date === today) ||
          (period === "late" && t.due_date < today && !t.completed) ||
          (period === "future" && t.due_date > today)) &&
        (status === "all" || t.completed === (status === "done")) &&
        (priority === "all" || t.priority === priority),
    )
    .sort((a, b) =>
      order === "title"
        ? a.title.localeCompare(b.title, "pt-BR")
        : order === "priority" && a.priority !== b.priority
          ? ["high", "medium", "low"].indexOf(a.priority) -
            ["high", "medium", "low"].indexOf(b.priority)
          : (a.due_date + (a.due_time || "23:59")).localeCompare(
              b.due_date + (b.due_time || "23:59"),
            ),
    );
  return (
    <>
      <Header
        subtitle={labelDate(today, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Hoje"
        action={
          <button className="primary" onClick={() => open({ kind: "tasks" })}>
            <Plus />
            Nova tarefa
          </button>
        }
      />
      <Progress tasks={tasks} />
      <section className="panel">
        <div className="section-head">
          <h2>Minhas tarefas</h2>
          <button
            className="quiet-btn"
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={16} />
            Filtros
            <ChevronRight size={15} />
          </button>
        </div>
        <div aria-label="Período das tarefas" className="segmented">
          {Object.entries({
            today: "Hoje",
            late: "Atrasadas",
            future: "Programadas",
            all: "Todas",
          }).map(([v, l]) => (
            <button
              key={v}
              aria-pressed={period === v}
              onClick={() => setPeriod(v)}
            >
              {l}
            </button>
          ))}
        </div>
        {filters && (
          <div className="filters">
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="done">Concluídas</option>
              </select>
            </label>
            <label>
              Prioridade
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="all">Todas</option>
                {Object.entries(priorities).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ordenar por
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="date">Vencimento</option>
                <option value="priority">Prioridade</option>
                <option value="title">Título</option>
              </select>
            </label>
          </div>
        )}
        {visible.length ? (
          visible.map((t) => (
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
            title="Nenhuma tarefa por aqui"
            body="Crie uma tarefa ou altere os filtros."
          />
        )}
      </section>
    </>
  );
}
