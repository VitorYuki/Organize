import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, WifiOff } from "lucide-react";
import "@fontsource-variable/dm-sans";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./style.css";
import { api, message } from "./api";
import { Auth } from "./Auth";
import { Workspace } from "./Workspace";
import { Logo } from "./ui";
import type { Theme, User } from "./types";
function storedTheme(): Theme {
  try {
    const v = localStorage.getItem("organize-theme");
    return v === "dark" || v === "light" ? v : "system";
  } catch {
    return "system";
  }
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState(""),
    [toast, setToast] = useState(""),
    [theme, setTheme] = useState<Theme>(storedTheme),
    [dark, setDark] = useState(
      document.documentElement.dataset.theme === "dark",
    ),
    [offline, setOffline] = useState(!navigator.onLine),
    [worker, setWorker] = useState<ServiceWorker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const updateUser = useCallback((u: User) => {
    setUser(u);
    setTheme(u.theme);
  }, []);
  const session = useCallback(async () => {
    setFailure("");
    try {
      const { user: u } = await api<{ user: User | null }>("auth/session/");
      if (u) updateUser(u);
      else setUser(null);
    } catch (err) {
      setFailure(message(err));
    } finally {
      setLoading(false);
    }
  }, [updateUser]);
  useEffect(() => {
    void session();
  }, [session]);
  const userId = user?.id;
  useEffect(() => {
    if (userId === undefined) return;
    let active = true;
    let checking = false;
    async function check(event: Event) {
      if (
        !(event instanceof CustomEvent) ||
        event.detail !== userId ||
        checking
      )
        return;
      checking = true;
      try {
        const { user: current } = await api<{ user: User | null }>(
          "auth/session/",
        );
        if (!active || current?.id === userId) return;
        setToast("");
        location.hash = "home";
        if (current) updateUser(current);
        else {
          setUser(null);
          setNotice("Sua sessão terminou. Entre novamente.");
        }
      } catch {
        /* The workspace keeps the request error visible if verification fails. */
      } finally {
        checking = false;
      }
    }
    window.addEventListener("organize:session-check", check);
    return () => {
      active = false;
      window.removeEventListener("organize:session-check", check);
    };
  }, [userId, updateUser]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const d = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = d ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", d ? "#17211e" : "#f7f6f1");
      setDark(d);
    }
    apply();
    try {
      localStorage.setItem("organize-theme", theme);
    } catch {
      /* Storage may be disabled by the browser. */
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let active = true;
    const inspect = (sw: ServiceWorker | null) => {
      if (active && sw && navigator.serviceWorker.controller) setWorker(sw);
    };
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        inspect(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed") inspect(installing);
          });
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function notify(s: string) {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3100);
  }
  const login = (u: User) => {
    location.hash = "home";
    setNotice("");
    updateUser(u);
  };
  async function logout() {
    await api("auth/logout/", "POST", undefined, userId);
    setUser(null);
    setNotice("");
    setToast("");
    location.hash = "home";
  }
  return (
    <>
      {offline && (
        <div className="global-notice" role="status">
          <WifiOff size={17} />
          Sem conexão. Consulte e salve seus dados quando a rede voltar.
        </div>
      )}
      {worker && (
        <div className="global-notice" role="status">
          <RefreshCw size={16} />
          Uma nova versão está disponível.
          <button
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
              worker.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            Atualizar
          </button>
        </div>
      )}
      {loading || failure ? (
        <main className="boot">
          <Logo />
          {failure ? (
            <>
              <p role="alert">{failure}</p>
              <button className="primary" onClick={() => void session()}>
                Tentar novamente
              </button>
            </>
          ) : (
            <p role="status">Abrindo seu espaço…</p>
          )}
        </main>
      ) : user ? (
        <Workspace
          key={user.id}
          user={user}
          updateUser={updateUser}
          logout={logout}
          notify={notify}
        />
      ) : (
        <Auth
          onAuth={login}
          dark={dark}
          notice={notice}
          toggleTheme={() => setTheme(dark ? "light" : "dark")}
        />
      )}
      <div className={"toast " + (toast ? "shown" : "")} role="status">
        {toast}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
