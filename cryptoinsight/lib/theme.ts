// Shared theme logic: 'light' | 'dark' | 'system'.
// 'system' follows the OS preference. Persisted in localStorage as ci-theme.
// CLIENT-SIDE ONLY.

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "ci-theme";
const ORDER: ThemeChoice[] = ["light", "dark", "system"];

export function getStoredTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    // ignore
  }
  return "system";
}

/** The concrete theme currently in effect (resolves 'system' via OS). */
export function resolvedTheme(choice?: ThemeChoice): "light" | "dark" {
  const c = choice ?? getStoredTheme();
  if (c === "light" || c === "dark") return c;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.setAttribute("data-theme", resolvedTheme(choice));
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // private mode: theme just won't persist
  }
}

export function nextTheme(current: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

/** Re-apply when the OS theme flips while in 'system' mode. Returns cleanup. */
export function watchSystemTheme(): () => void {
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") {
        document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  } catch {
    return () => {};
  }
}
