"use client";

import { create } from "zustand";

export type ViewId =
  | "dashboard"
  | "inbox"
  | "rules"
  | "ai-config"
  | "leads"
  | "analytics"
  | "billing"
  | "settings";

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (view) => set({ view }),
  selectedAccountId: null,
  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
