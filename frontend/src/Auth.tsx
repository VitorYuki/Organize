import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { api, message } from "./api";
import { Alert, Field, Logo } from "./ui";
import type { User } from "./types";
import planner from "./assets/planner.webp";
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
      <div className="auth-art">
        <img src={planner} alt="" fetchPriority="high" />
        <div className="auth-brand">
          <Logo />
        </div>
      </div>
      <div className="auth-side">
        <button
          className="icon-btn theme-toggle"
          aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
          onClick={toggleTheme}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
        <div className="auth-form">
          <div className="overline">
            <span className="short-line" />{" "}
            {register ? "Cadastro" : "Acesso à conta"}
          </div>
          <h1>{register ? "Crie sua conta." : "Boas-vindas."}</h1>
          <p className="intro">
            {register
              ? "Crie seu espaço para organizar tarefas, compromissos e ideias."
              : "Entre para acessar seu planner pessoal."}
          </p>
          <form
            key={register ? "register" : "login"}
            onSubmit={submit}
            className="form-stack"
          >
            {register && (
              <Field label="Nome">
                <div className="input-with-icon">
                  <UserRound />
                  <input
                    required
                    name="name"
                    autoComplete="name"
                    maxLength={150}
                    placeholder="Seu nome"
                  />
                </div>
              </Field>
            )}
            <Field label="E-mail">
              <div className="input-with-icon">
                <Mail />
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  maxLength={254}
                />
              </div>
            </Field>
            <Field label="Senha">
              <div className="input-with-icon">
                <LockKeyhole />
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
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </Field>
            <Alert text={error || notice} />
            <button
              type="submit"
              className="primary auth-submit"
              disabled={busy}
            >
              {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
              <ArrowRight size={18} />
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
      </div>
    </main>
  );
}
