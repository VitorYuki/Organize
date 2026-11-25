import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, WifiOff } from "lucide-react";
import "./style.css";
import { api, message } from "./api";
import { Auth } from "./Auth";
import { Workspace } from "./Workspace";
import { Logo } from "./ui";
import type { Theme, User } from "./types";
type Session = { user: User | null; demo_enabled: boolean };
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
    [demoEnabled, setDemoEnabled] = useState(false),
    [creatingAccount, setCreatingAccount] = useState(false),
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
      const { user: u, demo_enabled } = await api<Session>("auth/session/");
      setDemoEnabled(demo_enabled);
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
  const isGuest = user?.is_guest === true;
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
        const { user: current, demo_enabled } =
          await api<Session>("auth/session/");
        if (!active) return;
        setDemoEnabled(demo_enabled);
        if (current?.id === userId) return;
        setCreatingAccount(false);
        setToast("");
        location.hash = "home";
        if (current) updateUser(current);
        else {
          setUser(null);
          setNotice(
            isGuest
              ? "Sua demonstração terminou. Você pode iniciar outra."
              : "Sua sessão terminou. Entre novamente.",
          );
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
  }, [userId, isGuest, updateUser]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const d = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = d ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          getComputedStyle(document.documentElement)
            .getPropertyValue("--paper")
            .trim(),
        );
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
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const showWaiting = () => {
          const waiting = reg.waiting;
          if (
            active &&
            waiting &&
            reg.active &&
            waiting !== reg.active &&
            navigator.serviceWorker.controller
          ) {
            setWorker(waiting);
          }
        };
        const watchInstalling = () =>
          reg.installing?.addEventListener("statechange", showWaiting);
        showWaiting();
        watchInstalling();
        reg.addEventListener("updatefound", watchInstalling);
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
    setCreatingAccount(false);
    setToast("");
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
      ) : user && !creatingAccount ? (
        <Workspace
          key={user.id}
          user={user}
          updateUser={updateUser}
          logout={logout}
          notify={notify}
          createAccount={() => setCreatingAccount(true)}
        />
      ) : (
        <Auth
          key={creatingAccount ? user?.id : "login"}
          onAuth={login}
          dark={dark}
          notice={notice}
          demoEnabled={demoEnabled}
          guestId={creatingAccount ? user?.id : undefined}
          onBack={() => setCreatingAccount(false)}
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
