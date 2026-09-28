type SenderCandidate<T> = T | null | undefined;

/**
 * Match an IPC sender against explicitly allowed webContents references.
 * Missing windows never widen access.
 */
export function isTrustedIpcSender<T>(sender: T, ...allowed: Array<SenderCandidate<T>>): boolean {
  return allowed.some(candidate => candidate != null && candidate === sender);
}
