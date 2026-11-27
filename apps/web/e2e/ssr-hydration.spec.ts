import { expect, test } from "@playwright/test";

test("D1 server hydration contains only the requested stock and history", async ({ request }) => {
  const response = await request.get("/stocks/AAPL");
  expect(response.ok()).toBe(true);
  const html = (await response.text()).replaceAll('\\"', '"');
  expect(html).toContain('"queryKey":["stocks","detail","AAPL"]');
  expect(html).toContain('"queryKey":["stocks","history","AAPL","1D"]');
  expect(html).not.toContain('"queryKey":["stocks","pages"]');
  expect(html).not.toContain('"queryKey":["stocks","list"]');
});

test("L1 home hydration includes both default-list and browse-page queries", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = (await response.text()).replaceAll('\\"', '"');
  expect(html).toContain('"queryKey":["stocks","list"]');
  expect(html).toContain('"queryKey":["stocks","pages"]');
});
