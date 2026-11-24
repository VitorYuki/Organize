import { createServer, get } from "node:http";
import type { AddressInfo } from "node:net";
import type { Page } from "@playwright/test";

// Firefox can keep a service worker's network access after the page context
// switches offline. Closing a second loopback origin disconnects both, while
// the main preview and parallel tests keep running.
export async function disconnectPreview(page: Page, upstream: string) {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", upstream).pathname;
    const connection = get(upstream + path, (asset) => {
      response.writeHead(asset.statusCode ?? 500, asset.headers);
      asset.pipe(response);
    });
    connection.on("error", () => response.destroy());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
  } finally {
    const closed = new Promise<void>((resolve) =>
      server.close(() => resolve()),
    );
    server.closeAllConnections();
    await closed;
  }
}
