import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("transições respondem à preferência de movimento reduzido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".auth-form")).toHaveCSS(
    "animation-name",
    "content-in",
  );
  await button(page, "Experimentar sem conta").click();
  await navigate(page, "Calendário");
  await expect(page.locator("#main-content")).toHaveCSS(
    "animation-duration",
    "0.16s",
  );
  const month = page.locator(".month-grid");
  await button(page, "Próximo mês").click();
  await expect(month).toHaveCSS("animation-name", "none");
  await button(page, "Novo evento").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("animation-name", "sheet-in");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCSS("animation-name", "fade-in");
  await expect(button(page, "Salvar")).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

async function navigate(page: Page, name: string) {
  const tab = page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
}

test("demonstração oferece dados editáveis, tema persistente, restauração e saída", async ({
  page,
}, info) => {
  await page.goto("/");
  const start = button(page, "Experimentar sem conta");
  await expect(start).toBeVisible();
  await expect(start).toHaveAccessibleDescription(
    "Explore o Organize sem precisar criar uma conta.",
  );
  const bounds = (await start.boundingBox())!;
  expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  if (["compacto", "iphone", "desktop"].includes(info.project.name)) {
    const path = info.outputPath("demo-entrada.png");
    await page.screenshot({ path, scale: "css" });
    await info.attach("entrada da demonstração", {
      path,
      contentType: "image/png",
    });
  }
  await start.click();
  await expect(page.getByRole("heading", { name: /Visitante/ })).toBeVisible();
  await expect(page.getByText("Estudar Python", { exact: true })).toBeVisible();

  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Salvar", exact: true });
  const title = dialog.getByLabel("Título", { exact: true });
  await button(page, "Nova tarefa").click();
  await title.fill("Praticar o planner");
  await save.click();
  await navigate(page, "Hoje");
  await page.getByRole("button", { name: /Praticar o planner/ }).click();
  await title.fill("Planejar o próximo estudo");
  await save.click();
  await page
    .getByRole("checkbox", { name: "Concluir Planejar o próximo estudo" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Reabrir Planejar o próximo estudo" }),
  ).toBeChecked();

  await navigate(page, "Calendário");
  await button(page, "Novo evento").click();
  await title.fill("Café com a equipe");
  await save.click();
  await expect(
    page.getByRole("button", { name: /Café com a equipe/ }),
  ).toBeVisible();

  await navigate(page, "Home");
  await button(page, "Nova anotação").click();
  await title.fill("Anotações do visitante");
  await dialog
    .getByLabel("Conteúdo", { exact: true })
    .fill("Comparar ideias na próxima semana.");
  await save.click();
  await expect(
    page.getByText("Anotações do visitante", { exact: true }),
  ).toBeVisible();
  await button(page, "Nova lista").click();
  await dialog
    .getByLabel("Nome da lista", { exact: true })
    .fill("Mercado da semana");
  await save.click();
  await page.getByRole("button", { name: /Mercado da semana/ }).click();
  await page.getByLabel("Novo item", { exact: true }).fill("Farinha");
  await button(page, "Adicionar item").click();
  await expect(
    page.getByRole("checkbox", { name: "Concluir Farinha" }),
  ).toBeVisible();

  await navigate(page, "Ajustes");
  const profile = page.getByRole("region", { name: "Visitante" });
  await expect(profile.getByText("Modo demonstração")).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveCount(0);
  await expect(button(page, "Alterar senha")).toHaveCount(0);
  if (["compacto", "iphone", "desktop"].includes(info.project.name)) {
    const path = info.outputPath("demo-perfil.png");
    await page.screenshot({ path, scale: "css" });
    await info.attach("perfil do visitante", {
      path,
      contentType: "image/png",
    });
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(violations.map(({ id }) => id)).toEqual([]);
  }
  await button(page, "Claro").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await button(page, "Automático").click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await button(page, "Escuro").click();
  await expect(button(page, "Escuro")).toBeEnabled();
  await page.reload();
  await expect(profile).toBeVisible();
  await expect(button(page, "Escuro")).toHaveAttribute("aria-pressed", "true");
  await navigate(page, "Hoje");
  await expect(
    page.getByRole("checkbox", { name: "Reabrir Planejar o próximo estudo" }),
  ).toBeChecked();

  await navigate(page, "Ajustes");
  await button(page, "Restaurar dados de demonstração").click();
  await dialog
    .getByRole("button", { name: "Restaurar dados", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await navigate(page, "Hoje");
  await expect(page.getByText("Estudar Python", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Planejar o próximo estudo", { exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Ajustes");
  await expect(button(page, "Escuro")).toHaveAttribute("aria-pressed", "true");
  await button(page, "Sair da demonstração").click();
  await dialog
    .getByRole("button", { name: "Sair da demonstração", exact: true })
    .click();
  await expect(start).toBeVisible();
  await page.reload();
  await expect(start).toBeVisible();
});

test("visitante pode voltar do cadastro ou criar uma conta pessoal vazia", async ({
  page,
}) => {
  await page.goto("/");
  await button(page, "Experimentar sem conta").click();
  await navigate(page, "Ajustes");
  await button(page, "Criar conta pessoal").click();
  await expect(
    page.getByRole("heading", { name: "Crie sua conta" }),
  ).toBeVisible();
  await button(page, "Voltar à demonstração").click();
  await expect(page.getByRole("region", { name: "Visitante" })).toBeVisible();
  await button(page, "Criar conta pessoal").click();
  await page.getByLabel("Nome", { exact: true }).fill("Beatriz Lima");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`organize-${randomUUID()}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill("Caneta%Azul-94!Janela");
  await button(page, "Criar conta").click();
  await expect(page.getByRole("heading", { name: /Beatriz/ })).toBeVisible();
  await expect(page.getByText("Estudar Python", { exact: true })).toHaveCount(
    0,
  );
  await navigate(page, "Ajustes");
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
  await expect(button(page, "Alterar senha")).toBeVisible();
});
