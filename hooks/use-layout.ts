import { create } from "zustand";

interface LayoutState {
	activeView: string;
	setActiveView: (view: string) => void;
	isPrimarySidebarOpen: boolean;
	isSecondarySidebarOpen: boolean;
	togglePrimarySidebar: () => void;
	toggleSecondarySidebar: () => void;
}

export const useLayout = create<LayoutState>((set) => ({
	activeView: "explorer",
	setActiveView: (view) => set({ activeView: view }),
	isPrimarySidebarOpen: true,
	isSecondarySidebarOpen: true,
	togglePrimarySidebar: () =>
		set((state) => ({ isPrimarySidebarOpen: !state.isPrimarySidebarOpen })),
	toggleSecondarySidebar: () =>
		set((state) => ({ isSecondarySidebarOpen: !state.isSecondarySidebarOpen })),
}));
