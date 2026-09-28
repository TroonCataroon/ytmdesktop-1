import { describe, expect, it } from "vitest";
import { isAllowedExternalUrl } from "./external-url";

describe("isAllowedExternalUrl", () => {
  it.each(["https://youtube.com/watch?v=1", "https://music.youtube.com/", "https://google.com/", "https://accounts.google.com/"])(
    "allows trusted HTTPS destinations: %s",
    url => {
      expect(isAllowedExternalUrl(url)).toBe(true);
    }
  );

  it.each(["http://youtube.com/watch?v=1", "https://youtube.com.example.test/", "https://notgoogle.com/", "javascript:alert(1)", "not a url"])(
    "rejects untrusted destinations: %s",
    url => {
      expect(isAllowedExternalUrl(url)).toBe(false);
    }
  );
});
