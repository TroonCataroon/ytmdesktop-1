import { BrowserWindow } from "electron";
import { spawn } from "child_process";

export async function attachToDesktop(window: BrowserWindow): Promise<void> {
  if (process.platform !== "win32") {
    console.warn("Wallpaper mode is only supported on Windows.");
    return;
  }

  const handle = window.getNativeWindowHandle();
  // Convert buffer to integer/string handle
  // On 64-bit systems, handle is 8 bytes. On 32-bit, 4 bytes.
  // We can read it as BigInt or Int depending on size, or just use `ref-napi` style reading if we had it.
  // But Electron's buffer is just the raw bytes.

  let handleStr = "";
  if (handle.length === 8) {
    handleStr = handle.readBigUInt64LE(0).toString();
  } else {
    handleStr = handle.readUInt32LE(0).toString();
  }

  // Run inline PowerShell so we don't depend on shipping a .ps1 file in packaged builds.
  // NOTE: Avoid delegate construction in PowerShell (incompatible across PS versions); keep EnumWindows logic in C#.
  const command = `& {
param([Int64]$TargetHwnd)

$code = @"
using System;
using System.Runtime.InteropServices;

public static class Wallpaper {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

  public static IntPtr GetWallpaperWorkerW() {
    // Ask Progman to spawn a WorkerW behind desktop icons (Wallpaper Engine technique)
    IntPtr progman = FindWindow("Progman", null);
    IntPtr result;
    SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out result);

    IntPtr workerw = IntPtr.Zero;

    EnumWindows((topHwnd, lparam) => {
      // Find the desktop list view host under this top-level window
      IntPtr shellView = FindWindowEx(topHwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
      if (shellView != IntPtr.Zero) {
        // The wallpaper WorkerW is typically a sibling of the window hosting SHELLDLL_DefView
        workerw = FindWindowEx(IntPtr.Zero, topHwnd, "WorkerW", null);
      }
      return true;
    }, IntPtr.Zero);

    // Fallback: sometimes Progman itself can host the desktop view
    if (workerw == IntPtr.Zero) {
      workerw = progman;
    }
    return workerw;
  }
}
"@

Add-Type -TypeDefinition $code -ErrorAction Stop

$wallpaperWorkerW = [Wallpaper]::GetWallpaperWorkerW()
if ($wallpaperWorkerW -eq [IntPtr]::Zero) { throw "Could not find wallpaper WorkerW" }

$target = [IntPtr]::new($TargetHwnd)
[Wallpaper]::SetParent($target, $wallpaperWorkerW) | Out-Null

Write-Output ("AttachedTo=" + $wallpaperWorkerW.ToInt64())
} ${handleStr}`;

  return new Promise((resolve, reject) => {
    // #region agent log (debug instrumentation)
    try {
      fetch("http://127.0.0.1:7244/ingest/0a7fc512-60ca-4a36-8768-23f664c122af", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "wallpaper-stuck-1",
          hypothesisId: "E",
          location: "windows/wallpaper/index.ts:attachToDesktop:spawn",
          message: "spawning powershell attach",
          data: { windowId: window.id, handleBytes: handle.length, handleStrLen: handleStr.length },
          timestamp: Date.now()
        })
      }).catch((): void => undefined);
    } catch {
      // ignore
    }
    // #endregion agent log (debug instrumentation)

    const ps = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      windowsHide: true
    });

    let output = "";
    let error = "";

    ps.stdout.on("data", data => {
      output += data.toString();
    });

    ps.stderr.on("data", data => {
      error += data.toString();
    });

    ps.on("close", code => {
      if (code === 0) {
        console.log("Wallpaper attached successfully:", output.trim());
        // #region agent log (debug instrumentation)
        try {
          fetch("http://127.0.0.1:7244/ingest/0a7fc512-60ca-4a36-8768-23f664c122af", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "wallpaper-stuck-1",
              hypothesisId: "E",
              location: "windows/wallpaper/index.ts:attachToDesktop:close",
              message: "powershell attach exited success",
              data: { code, outputHead: output.trim().slice(0, 120) },
              timestamp: Date.now()
            })
          }).catch((): void => undefined);
        } catch {
          // ignore
        }
        // #endregion agent log (debug instrumentation)
        resolve();
      } else {
        console.error("Failed to attach wallpaper:", error || output);
        // #region agent log (debug instrumentation)
        try {
          fetch("http://127.0.0.1:7244/ingest/0a7fc512-60ca-4a36-8768-23f664c122af", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "wallpaper-stuck-1",
              hypothesisId: "E",
              location: "windows/wallpaper/index.ts:attachToDesktop:close",
              message: "powershell attach exited failure",
              data: { code, stderrHead: error.trim().slice(0, 200), outputHead: output.trim().slice(0, 120) },
              timestamp: Date.now()
            })
          }).catch((): void => undefined);
        } catch {
          // ignore
        }
        // #endregion agent log (debug instrumentation)
        reject(new Error(`PowerShell script exited with code ${code}: ${error}`));
      }
    });
  });
}
