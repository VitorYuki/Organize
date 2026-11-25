import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { api, message } from "./api";
import { Alert, Field, Logo } from "./ui";
import type { User } from "./types";
export function Auth({
  onAuth,
  toggleTheme,
  dark,
  notice,
}: {
  onAuth: (user: User) => void;
  toggleTheme: () => void;
  dark: boolean;
  notice: string;
}) {
  const [register, setRegister] = useState(false),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { user } = await api<{ user: User }>(
        "auth/" + (register ? "register/" : "login/"),
        "POST",
        Object.fromEntries(f),
      );
      onAuth(user);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <header className="auth-toolbar">
        <Logo />
        <button
          className="icon-btn theme-toggle"
          aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
          onClick={toggleTheme}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
      </header>
      <div className="auth-form">
        <h1>{register ? "Crie sua conta" : "Entre no Organize"}</h1>
        <p className="intro">
          {register
            ? "Organize tarefas, eventos, anotações e listas em um espaço pessoal."
            : "Acesse suas tarefas, eventos, anotações e listas."}
        </p>
        <form
          key={register ? "register" : "login"}
          onSubmit={submit}
          className="form-stack"
        >
          {register && (
            <Field label="Nome">
              <input
                required
                name="name"
                autoComplete="name"
                maxLength={150}
                placeholder="Seu nome"
              />
            </Field>
          )}
          <Field label="E-mail">
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              maxLength={254}
            />
          </Field>
          <div className="password-field">
            <Field label="Senha">
              <input
                required
                type={visible ? "text" : "password"}
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : 1}
                placeholder={
                  register ? "Pelo menos 8 caracteres" : "Digite sua senha"
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn"
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <Alert text={error || notice} />
          <button type="submit" className="primary auth-submit" disabled={busy}>
            {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <button
            onClick={() => {
              setRegister(!register);
              setError("");
              setVisible(false);
            }}
          >
            {register ? "Fazer login" : "Criar conta"}
          </button>
        </p>
      </div>
    </main>
  );
}
