import { create } from "zustand";

export type ActivityView = "explorer" | "search" | "database" | "analytics" | "settings";

interface SidebarState {
    isLeftSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    activeView: ActivityView;
    leftSize: number; // percentage size used by react-resizable-panels
    rightSize: number;
    lastNonZeroLeftSize: number;
    lastNonZeroRightSize: number;
    // actions
    toggleLeftSidebar: (view: ActivityView) => void;
    toggleRightSidebar: () => void;
    setLeftOpen: (open: boolean) => void;
    setRightOpen: (open: boolean) => void;
    setActiveView: (view: ActivityView) => void;
    setLeftSize: (size: number) => void;
    setRightSize: (size: number) => void;
}

export const useSidebar = create<SidebarState>((set, get) => ({
    isLeftSidebarOpen: true,
    isRightSidebarOpen: true,
    activeView: "explorer",
    leftSize: 20,
    rightSize: 25,
    lastNonZeroLeftSize: 20,
    lastNonZeroRightSize: 25,
    setLeftOpen: (open) => set({ isLeftSidebarOpen: open }),
    setRightOpen: (open) => set({ isRightSidebarOpen: open }),
    setActiveView: (view) => set({ activeView: view }),
    setLeftSize: (size) =>
        set((state) => ({
            leftSize: size,
            lastNonZeroLeftSize: size > 0 ? size : state.lastNonZeroLeftSize,
        })),
    setRightSize: (size) =>
        set((state) => ({
            rightSize: size,
            lastNonZeroRightSize: size > 0 ? size : state.lastNonZeroRightSize,
        })),
    toggleLeftSidebar: (view) => {
        const { isLeftSidebarOpen, activeView } = get();
        if (isLeftSidebarOpen && activeView === view) {
            set({ isLeftSidebarOpen: false });
        } else {
            set({ isLeftSidebarOpen: true, activeView: view });
        }
    },
    toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
}));
