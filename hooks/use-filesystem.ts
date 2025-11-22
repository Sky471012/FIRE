import { create } from "zustand";
import type { ClipboardData } from "@/types/filesystem";

interface FileSystemState {
	rootPath: string | null;
	setRootPath: (path: string | null) => void;
	expandedFolders: Set<string>;
	toggleFolder: (path: string) => void;
	expandFolder: (path: string) => void;
	collapseFolder: (path: string) => void;
	selectedEntry: string | null;
	setSelectedEntry: (path: string | null) => void;
	clipboard: ClipboardData | null;
	setClipboard: (data: ClipboardData | null) => void;
	refreshTrigger: number;
	triggerRefresh: () => void;
	showHiddenFiles: boolean;
	setShowHiddenFiles: (show: boolean) => void;
}

export const useFileSystem = create<FileSystemState>((set) => ({
	rootPath: null,
	setRootPath: (path) => set({ rootPath: path }),
	expandedFolders: new Set(),
	toggleFolder: (path) =>
		set((state) => {
			const newExpanded = new Set(state.expandedFolders);
			if (newExpanded.has(path)) {
				newExpanded.delete(path);
			} else {
				newExpanded.add(path);
			}
			return { expandedFolders: newExpanded };
		}),
	expandFolder: (path) =>
		set((state) => {
			const newExpanded = new Set(state.expandedFolders);
			newExpanded.add(path);
			return { expandedFolders: newExpanded };
		}),
	collapseFolder: (path) =>
		set((state) => {
			const newExpanded = new Set(state.expandedFolders);
			newExpanded.delete(path);
			return { expandedFolders: newExpanded };
		}),
	selectedEntry: null,
	setSelectedEntry: (path) => set({ selectedEntry: path }),
	clipboard: null,
	setClipboard: (data) => set({ clipboard: data }),
	refreshTrigger: 0,
	triggerRefresh: () =>
		set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
	showHiddenFiles: false,
	setShowHiddenFiles: (show) => set({ showHiddenFiles: show }),
}));
