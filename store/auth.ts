import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  status: "unknown" | "ready";
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  refresh: async () => {
    try {
      const { user } = await api.me();
      set({ user, status: "ready" });
      return user;
    } catch {
      set({ user: null, status: "ready" });
      return null;
    }
  },
  setUser: (user) => set({ user, status: "ready" }),
  logout: async () => {
    await api.logout();
    set({ user: null, status: "ready" });
  },
}));
