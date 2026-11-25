import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Trash2 } from "lucide-react";
import { dateKey, dateTimeISO, localInput, shiftDate } from "./dates";
import {
  colors,
  listIcons,
  priorities,
  type Editor as EditorState,
  type Save,
} from "./types";
import { Alert, Field, Modal, iconMap } from "./ui";
import { message } from "./api";
const names = {
  tasks: ["Nova tarefa", "Editar tarefa"],
  events: ["Novo evento", "Editar evento"],
  notes: ["Nova anotação", "Editar anotação"],
  lists: ["Nova lista", "Editar lista"],
};
export function Editor({
  editor,
  close,
  save,
}: {
  editor: EditorState;
  close: () => void;
  save: Save;
}) {
  const { kind, record } = editor,
    task = editor.kind === "tasks" ? editor.record : undefined,
    event = editor.kind === "events" ? editor.record : undefined,
    note = editor.kind === "notes" ? editor.record : undefined,
    list = editor.kind === "lists" ? editor.record : undefined;
  const date = ("date" in editor && editor.date) || dateKey();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [allDay, setAllDay] = useState(!!event?.all_day);
  const [start, setStart] = useState(
      event ? localInput(event.starts_at) : date + "T09:00",
    ),
    [end, setEnd] = useState(
      event ? localInput(event.ends_at) : date + "T10:00",
    );
  const [firstDate, setFirstDate] = useState(start.slice(0, 10)),
    [lastDate, setLastDate] = useState(
      event?.all_day ? shiftDate(end.slice(0, 10), -1) : end.slice(0, 10),
    );
  const [selectedIcon, setSelectedIcon] = useState(
      list?.icon && listIcons[list.icon] ? list.icon : "list",
    ),
    [selectedColor, setSelectedColor] = useState(
      list?.color && colors[list.color] ? list.color : "sage",
    );
  const done = () => {
    if (!busy) close();
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = Object.fromEntries(
        form.entries(),
      );
      if (kind === "tasks") payload.due_time = payload.due_time || null;
      if (kind === "events") {
        payload.all_day = allDay;
        payload.starts_at = dateTimeISO(allDay ? firstDate + "T00:00" : start);
        payload.ends_at = dateTimeISO(
          allDay ? shiftDate(lastDate, 1) + "T00:00" : end,
        );
        if (String(payload.ends_at) <= String(payload.starts_at))
          throw new Error("O término precisa ser posterior ao início.");
      }
      if (kind === "notes") payload.pinned = form.has("pinned");
      await save(
        kind + "/" + (record ? record.id + "/" : ""),
        record ? "PATCH" : "POST",
        payload,
      );
      close();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!record || busy) return;
    setBusy(true);
    setError("");
    try {
      await save(kind + "/" + record.id + "/", "DELETE");
      close();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={confirm ? "Confirmar exclusão" : names[kind][record ? 1 : 0]}
      close={done}
    >
      {confirm ? (
        <div className="form-stack">
          <p>
            Deseja excluir <strong>{record?.title}</strong>
            {kind === "lists" ? " e todos os seus itens" : ""}?
          </p>
          <Alert text={error} />
          <div className="action-row">
            <button
              disabled={busy}
              className="secondary"
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </button>
            <button className="danger" disabled={busy} onClick={remove}>
              Excluir
            </button>
          </div>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <Field label={kind === "lists" ? "Nome da lista" : "Título"}>
            <input
              name="title"
              defaultValue={record?.title}
              required
              maxLength={160}
              autoFocus
            />
          </Field>
          {(kind === "tasks" || kind === "events") && (
            <Field label="Descrição">
              <textarea
                name="description"
                defaultValue={(task || event)?.description}
                rows={2}
              />
            </Field>
          )}
          {kind === "tasks" && (
            <>
              <div className="field-grid">
                <Field label="Data de vencimento">
                  <input
                    name="due_date"
                    type="date"
                    required
                    defaultValue={task?.due_date || date}
                  />
                </Field>
                <Field label="Horário">
                  <input
                    type="time"
                    name="due_time"
                    defaultValue={task?.due_time?.slice(0, 5)}
                  />
                </Field>
              </div>
              <div className="field-grid">
                <Field label="Prioridade">
                  <select
                    name="priority"
                    defaultValue={task?.priority || "medium"}
                  >
                    {Object.entries(priorities).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Categoria">
                  <input
                    name="category"
                    defaultValue={task?.category}
                    maxLength={60}
                  />
                </Field>
              </div>
            </>
          )}
          {kind === "events" && (
            <>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => {
                    const on = e.target.checked;
                    if (on) {
                      setFirstDate(start.slice(0, 10));
                      setLastDate(end.slice(0, 10));
                    } else {
                      setStart(firstDate + "T09:00");
                      setEnd(lastDate + "T10:00");
                    }
                    setAllDay(on);
                  }}
                />
                Dia inteiro
              </label>
              <Field label="Início">
                <input
                  required
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? firstDate : start}
                  onChange={(e) =>
                    (allDay ? setFirstDate : setStart)(e.target.value)
                  }
                />
              </Field>
              <Field label="Término">
                <input
                  required
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? lastDate : end}
                  onChange={(e) =>
                    (allDay ? setLastDate : setEnd)(e.target.value)
                  }
                  min={allDay ? firstDate : undefined}
                />
              </Field>
              <small>Fuso horário de São Paulo</small>
            </>
          )}
          {kind === "notes" && (
            <>
              <Field label="Conteúdo">
                <textarea
                  name="content"
                  rows={7}
                  defaultValue={note?.content}
                />
              </Field>
              <label className="check-label">
                <input
                  type="checkbox"
                  name="pinned"
                  defaultChecked={note?.pinned}
                />
                Fixar anotação
              </label>
            </>
          )}
          {kind === "lists" && (
            <div className="list-appearance">
              <input type="hidden" name="icon" value={selectedIcon} />
              <input type="hidden" name="color" value={selectedColor} />
              <Field label="Escolha um ícone">
                <div className="icon-picker" role="group" aria-label="Ícone da lista">
                  {Object.entries(listIcons).map(([value, label]) => {
                    const Icon = iconMap[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        className="icon-choice"
                        aria-label={label}
                        aria-pressed={selectedIcon === value}
                        onClick={() => setSelectedIcon(value)}
                      >
                        <Icon size={21} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Escolha uma cor">
                <div className="color-picker" role="group" aria-label="Cor da lista">
                  {Object.entries(colors).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="color-choice"
                      data-color={value}
                      aria-label={label}
                      aria-pressed={selectedColor === value}
                      onClick={() => setSelectedColor(value)}
                    >
                      <span className="color-swatch">
                        {selectedColor === value && (
                          <Check size={17} aria-hidden="true" />
                        )}
                      </span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
          <Alert text={error} />
          <div className="action-row">
            {record && (
              <button
                type="button"
                className="remove-btn"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={17} />
                Excluir
              </button>
            )}
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={done}
            >
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
