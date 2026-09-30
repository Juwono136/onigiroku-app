import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  preferredLocaleHint: "id" | "en" | null;
  setPreferredLocaleHint: (locale: "id" | "en" | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      preferredLocaleHint: null,
      setPreferredLocaleHint: (locale) => set({ preferredLocaleHint: locale }),
    }),
    {
      name: "onigiroku-ui",
      partialize: (state) => ({
        preferredLocaleHint: state.preferredLocaleHint,
      }),
    },
  ),
);
