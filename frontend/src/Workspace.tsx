import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  House,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import { api, message } from "./api";
import { Logo } from "./ui";
import { Home } from "./Home";
import { Today } from "./Today";
import { Calendar } from "./Calendar";
import { Notes, Lists, ListDetail } from "./Library";
import { Settings } from "./Settings";
import { Editor } from "./Editor";
import type {
  CalendarEvent,
  Editor as EditState,
  ListItem,
  Note,
  Page,
  PersonalList,
  Records,
  Save,
  Task,
  User,
} from "./types";
const nav = [
  { key: "home", name: "Home", Icon: House },
  { key: "hoje", name: "Hoje", Icon: Sun },
  { key: "calendario", name: "Calendário", Icon: CalendarDays },
  { key: "ajustes", name: "Ajustes", Icon: SettingsIcon },
] as const;
const titles: Record<Page, string> = {
  home: "Home",
  hoje: "Hoje",
  calendario: "Calendário",
  ajustes: "Ajustes",
  notas: "Anotações",
  listas: "Listas",
};
function getRoute() {
  const [raw, id] = location.hash.slice(1).split("/");
  return {
    page: (Object.hasOwn(titles, raw) ? raw : "home") as Page,
    listId: raw === "listas" && id ? Number(id) : null,
  };
}
function merge<T extends { id: number }>(
  items: T[],
  value: T | undefined,
  id: number,
  remove: boolean,
) {
  if (remove) return items.filter((i) => i.id !== id);
  if (!value) return items;
  return items.some((i) => i.id === value.id)
    ? items.map((i) => (i.id === value.id ? value : i))
    : [value, ...items];
}
export function Workspace({
  user,
  updateUser,
  logout,
  notify,
  createAccount,
}: {
  user: User;
  updateUser: (u: User) => void;
  logout: () => Promise<void>;
  notify: (t: string) => void;
  createAccount: () => void;
}) {
  const [route, setRoute] = useState(getRoute),
    [data, setData] = useState<Records | null>(null),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<EditState | null>(null),
    version = useRef(0),
    alive = useRef(true),
    toggling = useRef(new Set<number>());
  const { page, listId } = route;
  const load = useCallback(async () => {
    const current = ++version.current;
    setError("");
    try {
      const [tasks, events, notes, lists] = await Promise.all([
        api<Task[]>("tasks/", "GET", undefined, user.id),
        api<CalendarEvent[]>("events/", "GET", undefined, user.id),
        api<Note[]>("notes/", "GET", undefined, user.id),
        api<PersonalList[]>("lists/", "GET", undefined, user.id),
      ]);
      if (alive.current && version.current === current)
        setData({ tasks, events, notes, lists });
    } catch (err) {
      if (alive.current && version.current === current) setError(message(err));
    }
  }, [user.id]);
  async function resetDemo() {
    await api("auth/demo/reset/", "POST", undefined, user.id);
    setData(null);
    await load();
    notify("Dados da demonstração restaurados.");
  }
  useEffect(() => {
    alive.current = true;
    void load();
    function refresh() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive.current = false;
      version.current++;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [load]);
  useEffect(() => {
    function routeChanged() {
      setRoute(getRoute());
      setEditor(null);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", routeChanged);
    return () => window.removeEventListener("hashchange", routeChanged);
  }, []);
  useEffect(() => {
    document.title = titles[page] + " · Organize";
  }, [page]);
  const go = (p: Page) => {
      location.hash = p;
    },
    selectList = (id: number) => {
      location.hash = "listas/" + id;
    };
  const sortedNotes = data
    ? [...data.notes].sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.updated_at.localeCompare(a.updated_at),
      )
    : [];
  const display = data ? { ...data, notes: sortedNotes } : null;
  const save: Save = async (path, method, body) => {
    const result = await api<unknown>(path, method, body, user.id);
    version.current++;
    if (!alive.current) return;
    setData((prev) => {
      if (!prev) return prev;
      const [kind, rawId, items, rawItemId] = path.split("/");
      const id = Number(rawId),
        deleted = method === "DELETE";
      if (kind === "tasks")
        return {
          ...prev,
          tasks: merge(prev.tasks, result as Task, id, deleted),
        };
      if (kind === "events")
        return {
          ...prev,
          events: merge(prev.events, result as CalendarEvent, id, deleted),
        };
      if (kind === "notes")
        return {
          ...prev,
          notes: merge(prev.notes, result as Note, id, deleted),
        };
      if (!items)
        return {
          ...prev,
          lists: merge(prev.lists, result as PersonalList, id, deleted),
        };
      return {
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === id
            ? {
                ...l,
                items:
                  rawItemId === "reorder"
                    ? (result as ListItem[])
                    : merge(
                        l.items,
                        result as ListItem,
                        Number(rawItemId),
                        deleted,
                      ).sort((a, b) => a.position - b.position),
              }
            : l,
        ),
      };
    });
    notify(method === "DELETE" ? "Excluído." : "Alterações salvas.");
  };
  const toggle = async (t: Task) => {
    if (toggling.current.has(t.id)) return;
    toggling.current.add(t.id);
    try {
      await save("tasks/" + t.id + "/", "PATCH", { completed: !t.completed });
    } catch (err) {
      notify(message(err));
    } finally {
      toggling.current.delete(t.id);
    }
  };
  const selected = display?.lists.find((l) => l.id === listId);
  const activeMain = page === "notas" || page === "listas" ? "home" : page;
  const navLinks = (mobile: boolean) =>
    nav.map(({ key, name, Icon }) => (
      <a
        key={key}
        href={"#" + key}
        aria-current={(mobile ? activeMain : page) === key ? "page" : undefined}
        onClick={() => setEditor(null)}
      >
        <Icon size={20} />
        <span>{name}</span>
      </a>
    ));
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Navegação principal" className="side-nav">
          {navLinks(false)}
        </nav>
        <div className="side-library">
          <div className="sidebar-label">Biblioteca</div>
          <nav aria-label="Biblioteca">
            <a
              href="#notas"
              aria-current={page === "notas" ? "page" : undefined}
            >
              <BookOpen />
              Anotações
            </a>
            <a
              href="#listas"
              aria-current={page === "listas" ? "page" : undefined}
            >
              <ClipboardList />
              Listas
            </a>
          </nav>
        </div>
        <button className="profile-link" onClick={() => go("ajustes")}>
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{user.name}</b>
            <small>Minha conta</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </aside>
      <div className="workspace">
        <div className="mobile-bar">
          <Logo />
          <button
            className="avatar"
            aria-label="Abrir ajustes da conta"
            onClick={() => go("ajustes")}
          >
            {user.name.slice(0, 1).toUpperCase()}
          </button>
        </div>
        <main
          key={`${page}/${listId ?? ""}`}
          id="main-content"
          className={`page-${page}`}
          tabIndex={-1}
        >
          {error && (
            <div className="error-panel" role="alert">
              {error}
              <button className="quiet-btn" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          )}
          {page === "ajustes" ? (
            <Settings
              user={user}
              update={updateUser}
              notify={notify}
              logout={logout}
              createAccount={createAccount}
              resetDemo={resetDemo}
            />
          ) : !display ? (
            !error && (
              <div
                className="skeleton"
                role="status"
                aria-label="Carregando seus dados"
              >
                <i />
                <i />
                <i />
              </div>
            )
          ) : page === "home" ? (
            <Home
              user={user}
              data={display}
              open={setEditor}
              go={go}
              toggle={toggle}
              selectList={selectList}
            />
          ) : page === "hoje" ? (
            <Today tasks={display.tasks} open={setEditor} toggle={toggle} />
          ) : page === "calendario" ? (
            <Calendar data={display} open={setEditor} toggle={toggle} />
          ) : page === "notas" ? (
            <Notes
              notes={display.notes}
              open={setEditor}
              back={() => go("home")}
            />
          ) : selected ? (
            <ListDetail
              key={selected.id}
              list={selected}
              open={setEditor}
              save={save}
              back={() => go("listas")}
            />
          ) : (
            <Lists
              lists={display.lists}
              open={setEditor}
              select={selectList}
              back={() => go("home")}
            />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {navLinks(true)}
      </nav>
      {editor && (
        <Editor editor={editor} close={() => setEditor(null)} save={save} />
      )}
    </div>
  );
}
