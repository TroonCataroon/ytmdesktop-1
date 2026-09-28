import { readFileSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { isTrustedIpcSender } from "./ipc-sender";

describe("isTrustedIpcSender", () => {
  it("wires memoryStore:get to both local windows while rejecting other senders", () => {
    const source = ts.createSourceFile("index.ts", readFileSync(path.join(process.cwd(), "src/main/index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
    let handler: ts.Node | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "ipcMain.handle" && node.arguments[0]?.getText(source) === '"memoryStore:get"') {
        handler = node.arguments[1];
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (!handler) throw new Error("memoryStore:get handler missing");
    const code = ts.transpile(`const handler = ${handler.getText(source)};`, { target: ts.ScriptTarget.ES2022 });
    const mainWindow = { webContents: {} };
    const settingsWindow = { webContents: {} };
    const memoryStore = { get: vi.fn(() => true) };
    const makeHandler = new Function("mainWindow", "settingsWindow", "memoryStore", "isTrustedIpcSender", `${code}; return handler;`);
    const get = makeHandler(mainWindow, settingsWindow, memoryStore, isTrustedIpcSender);
    for (const sender of [mainWindow.webContents, settingsWindow.webContents]) {
      expect(get({ sender }, "ytmViewLoading")).toBe(true);
    }
    expect(memoryStore.get).toHaveBeenCalledTimes(2);
    expect(get({ sender: {} }, "ytmViewLoading")).toBeUndefined();
    expect(makeHandler(null, null, memoryStore, isTrustedIpcSender)({ sender: {} }, "ytmViewLoading")).toBeUndefined();
    expect(memoryStore.get).toHaveBeenCalledTimes(2);
  });
  it("allows only an exact live sender", () => {
    const main = {};
    const settings = {};

    expect(isTrustedIpcSender(settings, main, settings)).toBe(true);
    expect(isTrustedIpcSender({}, main, settings)).toBe(false);
  });

  it("fails closed when optional windows are absent", () => {
    expect(isTrustedIpcSender({}, null, undefined)).toBe(false);
  });
});
