param (
    [string]$TargetHwnd
)

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Wallpaper {
   [DllImport("user32.dll", SetLastError = true)]
   public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

   [DllImport("user32.dll", SetLastError = true)]
   public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

   [DllImport("user32.dll", SetLastError = true)]
   public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

   [DllImport("user32.dll", SetLastError = true)]
   public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

   [DllImport("user32.dll")]
   public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

   [DllImport("user32.dll")]
   public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

   public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

   public static IntPtr workerw = IntPtr.Zero;

   public static bool EnumWindowsCallback(IntPtr hwnd, IntPtr lParam) {
       // Look for a WorkerW that has SHELLDLL_DefView as a child
       IntPtr p = FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
       if (p != IntPtr.Zero) {
           // If found, the WorkerW *after* this one in the Z-order is the one we want.
           // However, standard EnumWindows order is Z-order? 
           // Actually, the trick is to find the WorkerW that is the Next Sibling of the one with SHELLDLL_DefView?
           // Or just find the one created by the message.
           
           // Common implementation: Find the WorkerW that has SHELLDLL_DefView. 
           // Then get its next sibling using FindWindowEx(0, hwnd, "WorkerW", 0)?
           
           // Let's try to find the WorkerW that is BEHIND the one with SHELLDLL_DefView.
           // But EnumWindows doesn't give us easy "Next Sibling".
           
           // Alternative: The message creates a WorkerW. We just need to find the one that does NOT have SHELLDLL_DefView?
           // But there might be multiple.
           
           // Let's use the approach of finding the one with SHELLDLL_DefView, then getting the workerw variable set to the *next* one.
           // But we can't easily get "next" here.
           
           // Let's re-use the specific logic often used in C++:
           // Find window with class "WorkerW"
           // Get child "SHELLDLL_DefView"
           // If child exists, then the workerw we want is the one *after* this one.
           
           // Since we can't easily get "next" in EnumWindows, let's just find the one with SHELLDLL_DefView first.
           workerw = hwnd;
       }
       return true;
   }
}
"@

Add-Type -TypeDefinition $code

# 1. Find Progman
$progman = [Wallpaper]::FindWindow("Progman", $null)

# 2. Send 0x052C to Progman to spawn the wallpaper WorkerW
$result = [IntPtr]::Zero
[Wallpaper]::SendMessageTimeout($progman, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero, 0x0, 1000, [ref]$result)

# 3. Find the WorkerW that contains SHELLDLL_DefView
$shellWorkerW = [IntPtr]::Zero
[Wallpaper]::workerw = [IntPtr]::Zero
[Wallpaper]::EnumWindows([Wallpaper+EnumWindowsProc]::new([Wallpaper]::EnumWindowsCallback), [IntPtr]::Zero)
$shellWorkerW = [Wallpaper]::workerw

if ($shellWorkerW -eq [IntPtr]::Zero) {
    # Fallback: maybe no WorkerW yet?
    Write-Error "Could not find WorkerW with SHELLDLL_DefView"
    exit 1
}

# 4. The wallpaper WorkerW is the one *after* the shellWorkerW?
# Actually, we can just find the WorkerW that is a sibling of shellWorkerW and is NOT shellWorkerW?
# Or simpler: FindWindowEx(0, shellWorkerW, "WorkerW", null) might work if z-order is right?
# Let's try finding the WorkerW that is behind.

# Robust method: Iterate all WorkerW windows, pick the one that is visible and not shellWorkerW?
# Actually, the standard C++ code does:
# workerw = FindWindowEx(NULL, hwnd_SHELLDLL_DefView_Parent, "WorkerW", NULL);
$wallpaperWorkerW = [Wallpaper]::FindWindowEx([IntPtr]::Zero, $shellWorkerW, "WorkerW", $null)

if ($wallpaperWorkerW -eq [IntPtr]::Zero) {
    Write-Error "Could not find wallpaper WorkerW"
    exit 1
}

# 5. Set Parent
$target = [IntPtr]$TargetHwnd
[Wallpaper]::SetParent($target, $wallpaperWorkerW)

Write-Host "Attached to $wallpaperWorkerW"
