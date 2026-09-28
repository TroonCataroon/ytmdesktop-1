import { describe, expect, it } from "vitest";
import { isTrustedIpcSender } from "./ipc-sender";

describe("isTrustedIpcSender", () => {
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
