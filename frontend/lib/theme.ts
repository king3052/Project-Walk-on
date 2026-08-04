export type Theme = "dark" | "light";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore — theme just won't persist across reloads on this device
  }
}
