import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  PenLine,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Editor, ListItem, Note, PersonalList, Save } from "./types";
import { Alert, Empty, Field, Header, iconMap, Modal } from "./ui";
import { dateKey, labelDate } from "./dates";
import { message } from "./api";
export function NoteCard({ note, open }: { note: Note; open: () => void }) {
  return (
    <button className="note-card" onClick={open}>
      <span className="note-meta">
        <FileText size={17} />
        {note.pinned ? (
          <span>
            <Pin size={13} /> Fixada
          </span>
        ) : (
          <small>{labelDate(dateKey(note.updated_at))}</small>
        )}
      </span>
      <strong>{note.title}</strong>
      {note.content && <p>{note.content}</p>}
    </button>
  );
}
export function Notes({
  notes,
  open,
  back,
}: {
  notes: Note[];
  open: (e: Editor) => void;
  back: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = notes.filter((n) =>
    (n.title + " " + n.content)
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      <Header
        title="Anotações"
        eyebrow="Biblioteca pessoal"
        back={back}
        action={
          <button className="primary" onClick={() => open({ kind: "notes" })}>
            <Plus />
            Nova anotação
          </button>
        }
      />
      <label className="input-with-icon search">
        <Search />
        <input
          aria-label="Buscar anotações"
          type="search"
          placeholder="Buscar anotações"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {filtered.length ? (
        <div className="card-grid">
          {filtered.map((n) => (
            <NoteCard
              note={n}
              open={() => open({ kind: "notes", record: n })}
              key={n.id}
            />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon={FileText}
            title={query ? "Nenhum resultado" : "Suas anotações começam aqui"}
            body={
              query
                ? "Tente outra palavra."
                : "Guarde uma ideia ou registre algo importante."
            }
          />
        </div>
      )}
    </>
  );
}
export function ListCard({
  list,
  open,
}: {
  list: PersonalList;
  open: () => void;
}) {
  const Icon = iconMap[list.icon] || ClipboardList;
  return (
    <button className="list-card" onClick={open}>
      <span className={"list-icon tint-" + list.color}>
        <Icon size={21} />
      </span>
      <span className="row-main">
        <strong>{list.title}</strong>
        <small>
          {list.items.filter((i) => i.completed).length} de {list.items.length}{" "}
          concluídos
        </small>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}
export function Lists({
  lists,
  open,
  back,
  select,
}: {
  lists: PersonalList[];
  open: (e: Editor) => void;
  back: () => void;
  select: (id: number) => void;
}) {
  return (
    <>
      <Header
        title="Listas"
        eyebrow="Biblioteca pessoal"
        back={back}
        action={
          <button className="primary" onClick={() => open({ kind: "lists" })}>
            <Plus />
            Nova lista
          </button>
        }
      />
      <section className="panel">
        {lists.length ? (
          lists.map((l) => (
            <ListCard key={l.id} list={l} open={() => select(l.id)} />
          ))
        ) : (
          <Empty
            icon={ClipboardList}
            title="Crie sua primeira lista"
            body="Agrupe compras, livros, metas ou o que quiser acompanhar."
          />
        )}
      </section>
    </>
  );
}
export function ListDetail({
  list,
  save,
  open,
  back,
}: {
  list: PersonalList;
  save: Save;
  open: (e: Editor) => void;
  back: () => void;
}) {
  const [newItem, setNewItem] = useState(""),
    [item, setItem] = useState<ListItem | null>(null),
    [removing, setRemoving] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const base = "lists/" + list.id + "/items/",
    done = list.items.filter((i) => i.completed).length;
  async function act(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  function edit(i: ListItem) {
    setItem(i);
    setError("");
    setRemoving(false);
  }
  function add(e: FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    void act(async () => {
      await save(base, "POST", { title: newItem.trim() });
      setNewItem("");
    });
  }
  function move(i: number, dir: number) {
    const ids = list.items.map((t) => t.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    void act(() => save(base + "reorder/", "PUT", { ids }));
  }
  return (
    <>
      <Header
        eyebrow="Lista personalizada"
        title={list.title}
        back={back}
        action={
          <button
            className="secondary"
            onClick={() => open({ kind: "lists", record: list })}
          >
            <PenLine size={17} />
            Editar lista
          </button>
        }
      />
      <section className="panel">
        <div className="section-head">
          <h2>Itens da lista</h2>
          <small>
            {done} de {list.items.length} concluídos
          </small>
        </div>
        <form className="inline-form" onSubmit={add}>
          <input
            aria-label="Novo item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Novo item"
            maxLength={160}
            required
          />
          <button
            className="primary"
            aria-label="Adicionar item"
            disabled={busy}
          >
            <Plus size={19} />
          </button>
        </form>
        {!item && <Alert text={error} />}
        {!list.items.length && (
          <Empty
            icon={ClipboardList}
            title="Lista vazia"
            body="Adicione o primeiro item acima."
          />
        )}
        {list.items.map((i, idx) => (
          <div
            className={"item-row " + (i.completed ? "is-done" : "")}
            key={i.id}
          >
            <label className="checkbox-hit">
              <input
                type="checkbox"
                aria-label={(i.completed ? "Reabrir " : "Concluir ") + i.title}
                checked={i.completed}
                disabled={busy}
                onChange={() =>
                  void act(() =>
                    save(base + i.id + "/", "PATCH", {
                      completed: !i.completed,
                    }),
                  )
                }
              />
              <span>{i.completed && <Check size={14} />}</span>
            </label>
            <button className="row-main" onClick={() => edit(i)}>
              <strong>{i.title}</strong>
            </button>
            <button
              aria-label={"Subir " + i.title}
              className="icon-btn"
              disabled={busy || idx === 0}
              onClick={() => move(idx, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              aria-label={"Descer " + i.title}
              className="icon-btn"
              disabled={busy || idx === list.items.length - 1}
              onClick={() => move(idx, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </div>
        ))}
      </section>
      {item && (
        <Modal
          title={removing ? "Excluir item" : "Editar item"}
          close={() => {
            if (!busy) {
              setItem(null);
              setError("");
            }
          }}
        >
          {removing ? (
            <div className="form-stack">
              <p>
                Deseja excluir <b>{item.title}</b>?
              </p>
              <Alert text={error} />
              <div className="action-row">
                <button
                  disabled={busy}
                  className="secondary"
                  onClick={() => setRemoving(false)}
                >
                  Cancelar
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await save(base + item.id + "/", "DELETE");
                      setItem(null);
                    })
                  }
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const title = new FormData(e.currentTarget).get("title");
                void act(async () => {
                  await save(base + item.id + "/", "PATCH", { title });
                  setItem(null);
                });
              }}
            >
              <Field label="Título">
                <input
                  name="title"
                  required
                  maxLength={160}
                  defaultValue={item.title}
                />
              </Field>
              <Alert text={error} />
              <div className="action-row">
                <button
                  className="remove-btn"
                  disabled={busy}
                  type="button"
                  onClick={() => setRemoving(true)}
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
                <button className="primary" disabled={busy}>
                  Salvar
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
