import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { disconnectPreview } from "./offline";

const password = "Caneta%Azul-94!Janela";
const email = () => `organize-${randomUUID()}@example.test`;
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

async function register(page: Page, address: string) {
  await page.goto("/");
  await page.getByText("Criar conta", { exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Clara Lima");
  await page.getByLabel("E-mail", { exact: true }).fill(address);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await button(page, "Criar conta").click();
  await expect(page.getByRole("navigation").first()).toBeVisible();
}

async function navigate(page: Page, section: string) {
  const tab = page
    .getByRole("navigation")
    .getByRole("link", { name: section, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
}

async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled", scale: "css" });
  await info.attach(name, { path, contentType: "image/png" });
}

async function hasNoOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}

async function accessibility(page: Page, screen: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const issues = result.violations.map(({ id, nodes }) => ({
    id,
    elements: nodes.map(({ target, failureSummary }) => ({
      target,
      failureSummary,
    })),
  }));
  expect(issues, `Acessibilidade em ${screen}`).toEqual([]);
}

test("conta, agenda, anotações, listas e preferências", async ({
  page,
}, info) => {
  const address = email();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await register(page, address);
  await expect(button(page, "Nova tarefa")).toBeVisible();
  await hasNoOverflow(page);
  await capture(page, info, "home-clara");

  await button(page, "Nova tarefa").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Entregar proposta");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Confirmar o horário da reunião.");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await navigate(page, "Hoje");
  await page.getByRole("button", { name: /Entregar proposta/ }).click();
  await dialog.getByLabel("Título", { exact: true }).fill("Revisar proposta");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Concluir Revisar proposta" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Reabrir Revisar proposta" }),
  ).toBeVisible();
  await capture(page, info, "hoje");

  await navigate(page, "Home");
  await button(page, "Novo evento").click();
  await dialog.getByLabel("Título", { exact: true }).fill("Reunião de projeto");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await navigate(page, "Calendário");
  await expect(
    page.getByRole("button", { name: /Reunião de projeto/ }),
  ).toBeVisible();
  await hasNoOverflow(page);
  await capture(page, info, "calendario");
  await navigate(page, "Home");

  await button(page, "Nova anotação").click();
  await dialog.getByLabel("Título", { exact: true }).fill("Ideias da semana");
  await dialog
    .getByLabel("Conteúdo", { exact: true })
    .fill("Rever o orçamento da viagem.");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Ideias da semana", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Anotações" })
    .getByRole("button", { name: "Ver todas" })
    .click();
  await page
    .getByRole("searchbox", { name: "Buscar anotações" })
    .fill("viagem");
  await expect(
    page.getByRole("button", { name: /Ideias da semana/ }),
  ).toBeVisible();
  await hasNoOverflow(page);
  await capture(page, info, "anotacoes");
  await navigate(page, "Home");
  await button(page, "Nova lista").click();
  await dialog.getByLabel("Nome da lista", { exact: true }).fill("Compras");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByText("Compras", { exact: true }).click();
  await page.getByLabel("Novo item", { exact: true }).fill("Café");
  await button(page, "Adicionar item").click();
  await page.getByRole("checkbox", { name: "Concluir Café" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Reabrir Café" }),
  ).toBeVisible();
  await page.getByLabel("Novo item", { exact: true }).fill("Farinha");
  await button(page, "Adicionar item").click();
  await button(page, "Subir Farinha").click();
  await expect(page.getByRole("checkbox").first()).toHaveAccessibleName(
    "Concluir Farinha",
  );
  await button(page, "Farinha").click();
  await dialog.getByLabel("Título", { exact: true }).fill("Arroz");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await button(page, "Arroz").click();
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Excluir item");
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Concluir Arroz" }),
  ).toHaveCount(0);
  await hasNoOverflow(page);
  await capture(page, info, "lista");
  if (await dialog.isVisible()) await page.keyboard.press("Escape");

  await navigate(page, "Ajustes");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/profile/") &&
        response.request().method() === "PATCH" &&
        response.ok(),
    ),
    button(page, "Escuro").click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await navigate(page, "Home");
  await expect(button(page, "Nova tarefa")).toBeVisible();
  await hasNoOverflow(page);
  await accessibility(page, "Home escura");
  await capture(page, info, "home-escura");
  await navigate(page, "Ajustes");
  await hasNoOverflow(page);
  await accessibility(page, "Ajustes e perfil escuros");
  await capture(page, info, "ajustes-escuros");
  await button(page, "Claro").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await button(page, "Automático").click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await button(page, "Sair da conta").click();
  await dialog.getByRole("button", { name: "Sair da conta" }).click();
  await expect(button(page, "Entrar")).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill(address);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await button(page, "Entrar").click();
  await expect(page.getByText("Compras", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("orientação, formulários, navegação e acessibilidade", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(button(page, "Entrar")).toBeVisible();
  await hasNoOverflow(page);
  await capture(page, info, "login");
  await accessibility(page, "login");
  await button(page, "Usar tema escuro").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await accessibility(page, "login escuro");
  await capture(page, info, "login-escuro");
  await button(page, "Usar tema claro").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await button(page, "Criar conta").click();
  await expect(
    page.getByRole("heading", { name: "Crie sua conta" }),
  ).toBeVisible();
  await hasNoOverflow(page);
  await capture(page, info, "cadastro");
  await register(page, email());
  const navItem = page
    .getByRole("navigation")
    .getByText("Home", { exact: true });
  if (
    info.project.name.includes("iphone") ||
    info.project.name === "compacto"
  ) {
    const viewport = page.viewportSize()!;
    const bounds = await navItem.evaluate((node) => {
      const hit = node.closest("a,button")!.getBoundingClientRect();
      return {
        top: hit.top,
        height: hit.height,
        width: hit.width,
        bottom: hit.bottom,
      };
    });
    expect(bounds.top).toBeGreaterThan(viewport.height * 0.75);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
    expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44);
  }
  await accessibility(page, "home");
  await button(page, "Nova tarefa").focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Título", { exact: true }).focus();
  await hasNoOverflow(page);
  await accessibility(page, "formulário de tarefa");
  await capture(page, info, "formulario");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button(page, "Nova tarefa")).toBeFocused();
  const size = page.viewportSize()!;
  if (size.height > size.width) {
    await page.setViewportSize({ width: size.height, height: size.width });
  }
  await navigate(page, "Calendário");
  await hasNoOverflow(page);
  await capture(page, info, "paisagem");
  await accessibility(page, "calendário");
  if (info.project.name === "compacto") {
    await page.setViewportSize({ width: 320, height: 720 });
    await hasNoOverflow(page);
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
    await expect
      .poll(() =>
        page.locator(".bottom-nav a, .month-day").evaluateAll((nodes) =>
          Math.min(
            ...nodes.map((node) => {
              const { width, height } = node.getBoundingClientRect();
              return Math.min(width, height);
            }),
          ),
        ),
      )
      .toBeGreaterThanOrEqual(44);
  }
});

test("falhas de credenciais e validação preservam o formulário", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(email());
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await button(page, "Entrar").click();
  await expect(page.getByRole("alert")).toContainText(
    /e-mail ou senha incorretos/i,
  );
  await register(page, email());
  await button(page, "Novo evento").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Planejar a semana");
  await dialog.getByLabel("Início", { exact: true }).fill("2030-05-10T16:00");
  await dialog.getByLabel("Término", { exact: true }).fill("2030-05-10T15:00");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue(
    "Planejar a semana",
  );
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await navigate(page, "Hoje");
  await expect(page.getByText("Nenhuma tarefa por aqui")).toBeVisible();
});

test("PWA oferece instalação e página offline sem cache privado", async ({
  page,
  context,
  browserName,
  baseURL,
}) => {
  await register(page, email());
  const manifest = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifest).toBeTruthy();
  const request = await page.request.get(manifest!);
  expect(request.ok()).toBeTruthy();
  expect(await request.json()).toMatchObject({ display: "standalone" });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBeTruthy();
  await expect(button(page, "Atualizar")).toHaveCount(0);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const entries = await (await caches.open(name)).keys();
      urls.push(...entries.map((entry) => new URL(entry.url).pathname));
    }
    return urls;
  });
  expect(cached.filter((path) => path.startsWith("/api/"))).toEqual([]);
  if (browserName === "firefox") {
    await disconnectPreview(page, baseURL!);
  } else {
    await context.setOffline(true);
  }
  await page.reload();
  await expect(
    page.getByText(/sem conexão|sem internet|offline/i).first(),
  ).toBeVisible();
});

test("carregamento, falha transitória e expiração da sessão", async ({
  page,
  context,
}) => {
  await register(page, email());
  await expect(button(page, "Nova tarefa")).toBeVisible();
  // A controlling service worker can bypass route interception in WebKit.
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const responseGate = new Promise<void>((resolve) => {
      window.addEventListener("organize-test:release", () => resolve(), {
        once: true,
      });
    });
    window.fetch = async (input, init) => {
      if (
        typeof input !== "string" ||
        new URL(input, location.href).pathname !== "/api/v1/tasks/"
      ) {
        return originalFetch(input, init);
      }
      await responseGate;
      return Response.json(
        { detail: "Serviço temporariamente indisponível." },
        { status: 503 },
      );
    };
    window.addEventListener(
      "organize-test:restore-fetch",
      () => {
        window.fetch = originalFetch;
      },
      { once: true },
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  try {
    await expect(
      page.getByRole("status", { name: "Carregando seus dados" }),
    ).toBeVisible();
  } finally {
    await page.evaluate(() =>
      window.dispatchEvent(new Event("organize-test:release")),
    );
  }
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("organize-test:restore-fetch")),
  );
  await button(page, "Tentar novamente").click();
  await button(page, "Nova tarefa").click();
  await context.clearCookies({ name: "sessionid" });
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Sessão expirada");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(button(page, "Entrar")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Sua sessão terminou");
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("um editor aberto não grava na conta que assumiu a sessão", async ({
  page,
  context,
}) => {
  await register(page, email());
  await button(page, "Nova tarefa").click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Título", { exact: true })
    .fill("Rascunho da primeira conta");

  const csrf = (await context.cookies()).find(
    (cookie) => cookie.name === "csrftoken",
  );
  expect(csrf).toBeDefined();
  const registration = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf!.value },
    data: { name: "Marina Costa", email: email(), password },
  });
  expect(registration.status()).toBe(201);

  const rejected = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/tasks/") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await rejected).status()).toBe(409);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Marina/ })).toBeVisible();
  const tasks = await context.request.get("/api/v1/tasks/");
  expect(tasks.ok()).toBe(true);
  expect(await tasks.json()).toEqual([]);
});
