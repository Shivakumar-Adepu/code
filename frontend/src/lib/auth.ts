const TOKEN_KEY = "codeguard.token";
const USER_KEY = "codeguard.user";

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  plan?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function signIn(token: string, profile: UserProfile) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    // Trigger custom event to notify other parts of the app
    window.dispatchEvent(new CustomEvent("codeguard:auth-change"));
  } catch {
    /* ignore */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent("codeguard:auth-change"));
  } catch {
    /* ignore */
  }
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
