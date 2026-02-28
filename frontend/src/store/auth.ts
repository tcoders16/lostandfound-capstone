// src/store/auth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginAdmin } from "../lib/api";

type Role = "admin" | "rider";

type State = {
  token?: string;
  role?: Role;
  email?: string;
  lastActive: number; // epoch ms
  login: (role: Role, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  touch: () => void;
};

export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

// Dev bypass: allow any email/password when flag is set or in Vite dev
const ALLOW_ANY_LOGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ALLOW_ANY_LOGIN === "true") ||
  (typeof import.meta !== "undefined" && import.meta.env?.DEV);

function makeMockToken(role: Role, email: string) {
  // simple mock payload; NOT a real JWT
  return `mock.${btoa(JSON.stringify({ sub: email, role, iat: Date.now() }))}.dev`;
}

export const useAuth = create(
  persist<State>(
    (set) => ({
      token: undefined,
      role: undefined,
      email: undefined,
      lastActive: Date.now(),

      async login(role, email, password) {
        // Dev bypass path
        if (ALLOW_ANY_LOGIN) {
          const token = makeMockToken(role, email);
          set({ token, role, email, lastActive: Date.now() });
          return true;
        }

        // Real auth for admin; simple stub for rider
        if (role === "admin") {
          const { token } = await loginAdmin(email, password);
          set({ token, role, email, lastActive: Date.now() });
          return !!token;
        }

        // Rider stub (adjust as needed)
        set({ token: makeMockToken("rider", email), role: "rider", email, lastActive: Date.now() });
        return true;
      },

      logout() {
        set({ token: undefined, role: undefined, email: undefined, lastActive: 0 });
      },

      touch() {
        set({ lastActive: Date.now() });
      },
    }),
    { name: "lnf-auth" }
  )
);