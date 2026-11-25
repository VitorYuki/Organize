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
  demoEnabled,
  guestId,
  onBack,
}: {
  onAuth: (user: User) => void;
  toggleTheme: () => void;
  dark: boolean;
  notice: string;
  demoEnabled: boolean;
  guestId?: number;
  onBack: () => void;
}) {
  const fromDemo = guestId !== undefined;
  const [register, setRegister] = useState(fromDemo),
    [visible, setVisible] = useState(false),
    [pending, setPending] = useState<"credentials" | "demo" | null>(null),
    [error, setError] = useState(""),
    [demoError, setDemoError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const f = new FormData(e.currentTarget);
    setPending("credentials");
    setError("");
    setDemoError("");
    try {
      const { user } = await api<{ user: User }>(
        "auth/" + (register ? "register/" : "login/"),
        "POST",
        Object.fromEntries(f),
        guestId,
      );
      onAuth(user);
    } catch (err) {
      setError(message(err));
    } finally {
      setPending(null);
    }
  }
  async function startDemo() {
    if (pending) return;
    setPending("demo");
    setError("");
    setDemoError("");
    try {
      const { user } = await api<{ user: User }>("auth/demo/", "POST");
      onAuth(user);
    } catch (err) {
      setDemoError(message(err));
    } finally {
      setPending(null);
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
          {fromDemo
            ? "Sua conta começa vazia. Os dados temporários serão apagados ao concluir o cadastro."
            : register
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
          <button
            type="submit"
            className="primary auth-submit"
            disabled={pending !== null}
          >
            {pending === "credentials"
              ? "Aguarde…"
              : register
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>
        <p className="auth-switch">
          {!fromDemo &&
            (register ? "Já tem uma conta? " : "Ainda não tem uma conta? ")}
          <button
            disabled={pending !== null}
            onClick={() => {
              if (fromDemo) return onBack();
              setRegister(!register);
              setError("");
              setDemoError("");
              setVisible(false);
            }}
          >
            {fromDemo
              ? "Voltar à demonstração"
              : register
                ? "Fazer login"
                : "Criar conta"}
          </button>
        </p>
        {!register && demoEnabled && (
          <div className="auth-demo">
            <button
              type="button"
              className="secondary"
              aria-describedby="demo-description"
              disabled={pending !== null}
              onClick={() => void startDemo()}
            >
              {pending === "demo"
                ? "Abrindo demonstração…"
                : "Experimentar sem conta"}
            </button>
            <p id="demo-description">
              Explore o Organize sem precisar criar uma conta.
            </p>
            <Alert text={demoError} />
          </div>
        )}
      </div>
    </main>
  );
}
