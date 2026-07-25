import { platform as nativePlatform } from "@tauri-apps/plugin-os";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type DesktopPlatform = "linux" | "macos" | "windows" | null;

function detectedDesktopPlatform(): DesktopPlatform {
  if (!isTauri()) return null;

  const platform = nativePlatform();
  if (platform === "linux" || platform === "macos" || platform === "windows") {
    return platform;
  }
  return null;
}

export function isWeb(): boolean {
  return typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);
}

export function isLinuxDesktop(): boolean {
  return detectedDesktopPlatform() === "linux";
}

export function isMacDesktop(): boolean {
  return detectedDesktopPlatform() === "macos";
}

export function isWindowsDesktop(): boolean {
  return detectedDesktopPlatform() === "windows";
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
  if ((navigator.maxTouchPoints ?? 0) > 0 && Math.min(window.innerWidth, window.innerHeight) < 640) {
    return true;
  }
  return false;
}

// ANDROID FORK: many `@tauri-apps/api/window` methods (isFullscreen,
// isMaximized, onResized, toggleMaximize, startResizeDragging...) are
// unsupported on Tauri's mobile runtime and reject with errors like "Plugin
// window not initialized" — there's no desktop-style window chrome to
// query/control on a single, OS-managed mobile Activity anyway. Anything
// that calls into those APIs should check this first and skip entirely on
// Android/iOS, instead of trying to detect a specific desktop OS.
export function isDesktopTauri(): boolean {
  return detectedDesktopPlatform() !== null;
}
