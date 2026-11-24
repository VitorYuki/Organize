import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const clusterBrowsers = resolve("../.local/playwright");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(clusterBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = clusterBrowsers;
}
const python =
  process.platform === "win32"
    ? ".venv\\Scripts\\python.exe"
    : ".venv/bin/python";
const baseURL = "http://127.0.0.1:4174";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90000,
  workers: 2,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
    reducedMotion: "reduce",
    actionTimeout: 12000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "compacto",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "iphone-grande",
      use: {
        ...devices["iPhone 13 Pro Max"],
        viewport: { width: 430, height: 932 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad (gen 7)"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: `"${resolve("..", python)}" -m qa.server`,
      cwd: "..",
      url: "http://127.0.0.1:8002/api/v1/auth/session/",
      reuseExistingServer: false,
      timeout: 90000,
    },
    {
      command:
        "npm run build && npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
      env: { ORGANIZE_API_TARGET: "http://127.0.0.1:8002" },
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
