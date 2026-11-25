import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  atNoon,
  clock,
  dateKey,
  labelDate,
  monthStart,
  onDay,
  shiftDate,
} from "./dates";
import { Empty, Header } from "./ui";
import { TaskRow } from "./Today";
import type { CalendarEvent, Editor, Records, Task } from "./types";
export function EventRow({
  event,
  open,
}: {
  event: CalendarEvent;
  open: () => void;
}) {
  const start = dateKey(event.starts_at),
    last = dateKey(new Date(Date.parse(event.ends_at) - 1));
  const time = event.all_day
    ? "Dia inteiro"
    : clock(event.starts_at) +
      " – " +
      (start !== dateKey(event.ends_at)
        ? labelDate(dateKey(event.ends_at)) + " · "
        : "") +
      clock(event.ends_at);
  return (
    <button className="event-row" onClick={open}>
      <span className="day-tile">
        <small>{labelDate(start, { month: "short" }).replace(".", "")}</small>
        <b>{Number(start.slice(-2))}</b>
      </span>
      <span className="row-main">
        <strong>{event.title}</strong>
        <small>
          {time}
          {event.all_day && start !== last ? " · até " + labelDate(last) : ""}
        </small>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}
export function Calendar({
  data,
  open,
  toggle,
}: {
  data: Records;
  open: (e: Editor) => void;
  toggle: (t: Task) => void;
}) {
  const today = dateKey(),
    [selected, setSelected] = useState(today),
    [month, setMonth] = useState(monthStart(today, 0));
  const offset = atNoon(month).getUTCDay(),
    days = Number(shiftDate(monthStart(month, 1), -1).slice(-2)),
    events = data.events.filter((e) => onDay(e, selected)),
    tasks = data.tasks.filter((t) => t.due_date === selected);
  function changeMonth(delta: number) {
    const next = monthStart(month, delta);
    setMonth(next);
    setSelected(next);
  }
  return (
    <>
      <Header
        title="Calendário"
        action={
          <button
            className="primary create-activity"
            onClick={() => open({ kind: "events", date: selected })}
          >
            <Plus />
            Novo evento
          </button>
        }
      />
      <div className="calendar-layout">
        <section className="panel month-panel">
          <div className="section-head">
            <h2 className="calendar-date">
              {labelDate(month, { month: "long", year: "numeric" })}
            </h2>
            <div className="inline-actions">
              <button
                className="icon-btn"
                aria-label="Mês anterior"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft />
              </button>
              <button
                className="quiet-btn"
                onClick={() => {
                  setMonth(monthStart(today, 0));
                  setSelected(today);
                }}
              >
                Hoje
              </button>
              <button
                className="icon-btn"
                aria-label="Próximo mês"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="month-grid" key={month}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((l) => (
              <span aria-hidden="true" className="weekday" key={l}>
                {l}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"offset" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const key = shiftDate(month, i),
                has =
                  data.events.some((e) => onDay(e, key)) ||
                  data.tasks.some((t) => t.due_date === key);
              return (
                <button
                  key={key}
                  className={"month-day " + (key === today ? "current" : "")}
                  aria-current={key === today ? "date" : undefined}
                  aria-pressed={key === selected}
                  aria-label={
                    labelDate(key, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }) + (has ? ", com atividades" : "")
                  }
                  onClick={() => setSelected(key)}
                >
                  {i + 1}
                  {has && <i />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="panel day-agenda">
          <div className="section-head">
            <h2 className="calendar-date">
              {labelDate(selected, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
          </div>
          {events.map((e) => (
            <EventRow
              event={e}
              key={e.id}
              open={() => open({ kind: "events", record: e })}
            />
          ))}
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              edit={() => open({ kind: "tasks", record: t })}
              toggle={() => toggle(t)}
            />
          ))}
          {!tasks.length && !events.length && (
            <Empty
              icon={CalendarDays}
              title="Agenda livre neste dia"
              body="Adicione um evento para reservar um horário."
            />
          )}
        </section>
      </div>
    </>
  );
}
