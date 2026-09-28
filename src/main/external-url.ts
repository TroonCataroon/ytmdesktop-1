const EXTERNAL_HOSTS = ["google.com", "youtube.com"] as const;

export function isAllowedExternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    return EXTERNAL_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
