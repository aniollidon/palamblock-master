import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("les llibreries de la interfície es carreguen localment", async () => {
  const renderer = resolve(dirname(fileURLToPath(import.meta.url)), "../src/renderer");
  const index = await readFile(resolve(renderer, "index.html"), "utf8");
  assert.doesNotMatch(index, /(?:src|href)=["']https?:\/\//);
  const paths = [...index.matchAll(/(?:src|href)="(\.\.\/\.\.\/node_modules\/[^"]+)"/g)];
  assert.equal(paths.length, 6);
  await Promise.all(paths.map((match) => access(resolve(renderer, match[1]))));
  const tabs = await readFile(resolve(renderer, "css/tabs.css"), "utf8");
  const browserTest = await readFile(resolve(renderer, "browser-test.html"), "utf8");
  assert.doesNotMatch(tabs, /fonts\.googleapis\.com/);
  assert.doesNotMatch(browserTest, /fonts\.googleapis\.com/);
});
