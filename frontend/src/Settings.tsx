import { useState, type FormEvent } from "react";
import {
  Check,
  KeyRound,
  Laptop,
  LogOut,
  MonitorSmartphone,
  Moon,
  Sun,
} from "lucide-react";
import { api, message } from "./api";
import { Alert, Field, Header, Modal } from "./ui";
import type { Theme, User } from "./types";
type Props = {
  user: User;
  update: (u: User) => void;
  logout: () => Promise<void>;
  notify: (t: string) => void;
};
export function Settings({ user, update, logout, notify }: Props) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState(false),
    [confirm, setConfirm] = useState(false);
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
  async function profile(p: Partial<User>) {
    const { user: result } = await api<{ user: User }>(
      "profile/",
      "PATCH",
      p,
      user.id,
    );
    update(result);
    notify("Preferências salvas.");
  }
  function changeTheme(value: Theme) {
    const previous = user;
    update({ ...user, theme: value });
    void act(async () => {
      try {
        await profile({ theme: value });
      } catch (err) {
        update(previous);
        throw err;
      }
    });
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void act(() =>
      profile({
        name: String(f.get("name")).trim(),
        email: String(f.get("email")).trim(),
      }),
    );
  }
  return (
    <>
      <Header title="Ajustes" />
      {!password && !confirm && <Alert text={error} />}
      <section className="panel">
        <div className="section-head">
          <h2>Meu perfil</h2>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <div className="field-grid">
            <Field label="Nome">
              <input
                required
                name="name"
                defaultValue={user.name}
                maxLength={150}
                autoComplete="name"
              />
            </Field>
            <Field label="E-mail">
              <input
                required
                type="email"
                name="email"
                defaultValue={user.email}
                autoComplete="email"
              />
            </Field>
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="quiet-btn"
              onClick={() => {
                setError("");
                setPassword(true);
              }}
            >
              <KeyRound size={17} />
              Alterar senha
            </button>
            <button disabled={busy} className="secondary">
              Salvar perfil
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Aparência</h2>
        </div>
        <div className="theme-options">
          {(
            [
              { v: "light", title: "Claro", Icon: Sun },
              { v: "dark", title: "Escuro", Icon: Moon },
              { v: "system", title: "Automático", Icon: Laptop },
            ] as const
          ).map(({ v, title, Icon }) => (
            <button
              disabled={busy}
              aria-pressed={user.theme === v}
              key={v}
              onClick={() => changeTheme(v)}
            >
              <Icon size={21} />
              <strong>{title}</strong>
              {user.theme === v && <Check size={14} className="theme-check" />}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Aplicativo</h2>
          <span className="version">v1.0.0</span>
        </div>
        <dl className="preferences">
          <div>
            <dt>Idioma</dt>
            <dd>Português (Brasil)</dd>
          </div>
          <div>
            <dt>Fuso horário</dt>
            <dd>América/São Paulo</dd>
          </div>
        </dl>
        <details className="install-help">
          <summary>
            <MonitorSmartphone size={19} />
            Instalar o Organize
          </summary>
          <ul>
            <li>
              <strong>iPhone</strong> — Abra o Organize no Safari, toque em
              Compartilhar e em “Adicionar à Tela de Início”.
            </li>
            <li>
              <strong>Android</strong> — Abra o menu do navegador e escolha
              “Instalar aplicativo” ou “Adicionar à tela inicial”.
            </li>
            <li>
              <strong>Computador</strong> — Em um navegador compatível, use o
              ícone de instalação na barra de endereço.
            </li>
          </ul>
          <p>
            A instalação depende do suporte do navegador e de uma conexão HTTPS
            ou localhost. Seus dados precisam de conexão para abrir e salvar.
          </p>
        </details>
      </section>
      <button
        className="logout"
        onClick={() => {
          setError("");
          setConfirm(true);
        }}
      >
        <LogOut size={18} />
        Sair da conta
      </button>
      {confirm && (
        <Modal
          title="Sair da conta?"
          close={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <div className="form-stack">
            <p>Você poderá entrar novamente com seu e-mail e senha.</p>
            <Alert text={error} />
            <div className="action-row">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void act(logout)}
              >
                Sair da conta
              </button>
            </div>
          </div>
        </Modal>
      )}
      {password && (
        <Modal
          title="Alterar senha"
          close={() => {
            if (!busy) setPassword(false);
          }}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(e.currentTarget));
              void act(async () => {
                await api("auth/password/", "POST", body, user.id);
                notify("Senha alterada.");
                setPassword(false);
              });
            }}
          >
            <Field label="Senha atual">
              <input
                required
                type="password"
                name="old_password"
                autoComplete="current-password"
              />
            </Field>
            <Field label="Nova senha">
              <input
                required
                minLength={8}
                type="password"
                name="new_password"
                autoComplete="new-password"
              />
            </Field>
            <Alert text={error} />
            <div className="action-row">
              <button className="primary" disabled={busy}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
