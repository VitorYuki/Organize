export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fieldNames: Record<string, string> = {
  email: "E-mail",
  password: "Senha",
  new_password: "Nova senha",
  old_password: "Senha atual",
  name: "Nome",
  title: "Título",
  ends_at: "Término",
  starts_at: "Início",
  due_date: "Data de vencimento",
};
function explain(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(explain).join(" ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([key, errors]) =>
        [fieldNames[key], explain(errors)].filter(Boolean).join(" — "),
      )
      .join(" ");
  return "";
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  userId?: number,
): Promise<T> {
  const csrf = document.cookie
    .split("; ")
    .find((v) => v.startsWith("csrftoken="))
    ?.slice(10);
  let response: Response;
  try {
    response = await fetch("/api/v1/" + path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(method === "GET" || !csrf
          ? {}
          : { "X-CSRFToken": decodeURIComponent(csrf) }),
        ...(userId === undefined ? {} : { "X-Organize-User": String(userId) }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Conexão indisponível. Verifique a rede e tente novamente.",
    );
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (userId !== undefined && [401, 403, 409].includes(response.status)) {
      window.dispatchEvent(
        new CustomEvent("organize:session-check", { detail: userId }),
      );
    }
    throw new ApiError(
      response.status,
      explain(result) || "O serviço está indisponível. Tente novamente.",
    );
  }
  return result as T;
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
}
