/**
 * Host mount for the install-surface feature.
 * Standalone static hosting works without a host; this entry is for composable apps.
 *
 * @param {object} manifest
 * @param {{ mount?: (el: Element, vnode: unknown) => void, baseUrl?: string }} ctx
 */
export function registerFeature(manifest, ctx = {}) {
  if (manifest?.id !== "ytmd.install-surface") {
    throw new Error(`Unexpected manifest id: ${manifest?.id}`);
  }

  const base = (ctx.baseUrl || "/").replace(/\/?$/, "/");
  return {
    id: manifest.id,
    version: manifest.version,
    routes: (manifest.entry?.routes || []).map((r) => ({
      path: r.path,
      href: `${base}${String(r.file || "index.html").replace(/^\.\//, "")}`,
    })),
    open() {
      if (typeof window !== "undefined") {
        window.location.assign(`${base}index.html`);
      }
    },
  };
}

export default registerFeature;
