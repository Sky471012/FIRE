import type React from "react";
import { create } from "zustand";

export interface Tab {
	id: string;
	title: string;
	icon?: string;
	isDirty?: boolean;
	isPinned?: boolean;
	content?: React.ReactNode;
	filePath?: string;
	isBinary?: boolean;
	type?: "file" | "view" | "welcome";
	viewId?: string; // For view tabs (chat, datasets, analytics, etc.)
}

interface TabsState {
	tabs: Tab[];
	activeTabId: string | null;
	addTab: (tab: Omit<Tab, "id">) => string;
	addViewTab: (viewId: string, title: string, icon?: string) => string;
	removeTab: (id: string) => void;
	setActiveTab: (id: string) => void;
	updateTab: (id: string, updates: Partial<Tab>) => void;
	closeAllTabs: () => void;
	closeOtherTabs: (id: string) => void;
	closeTabsToRight: (id: string) => void;
	pinTab: (id: string) => void;
	loadWorkspaceTabs: (workspaceTabs: Tab[], activeId: string | null) => void;
	resetToWelcome: () => void;
}

export const useTabs = create<TabsState>((set, get) => ({
	tabs: [
		{
			id: "welcome",
			title: "Welcome",
			icon: "Flame",
			isPinned: false,
			isDirty: false,
			type: "welcome",
		},
	],
	activeTabId: "welcome",

	addTab: (tab) => {
		const state = get();

		// Check if a tab with the same filePath already exists
		if (tab.filePath) {
			const existingTab = state.tabs.find((t) => t.filePath === tab.filePath);
			if (existingTab) {
				// Switch to existing tab instead of creating a new one
				set({ activeTabId: existingTab.id });
				return existingTab.id;
			}
		}

		// Check if a tab with the same viewId already exists
		if (tab.viewId) {
			const existingTab = state.tabs.find((t) => t.viewId === tab.viewId);
			if (existingTab) {
				// Switch to existing tab instead of creating a new one
				set({ activeTabId: existingTab.id });
				return existingTab.id;
			}
		}

		const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newTab = { ...tab, id };
		set((state) => ({
			tabs: [...state.tabs, newTab],
			activeTabId: id,
		}));
		return id;
	},

	addViewTab: (viewId, title, icon) => {
		const state = get();

		// Check if a tab with the same viewId already exists
		const existingTab = state.tabs.find((t) => t.viewId === viewId);
		if (existingTab) {
			// Switch to existing tab instead of creating a new one
			set({ activeTabId: existingTab.id });
			return existingTab.id;
		}

		const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newTab: Tab = {
			id,
			title,
			icon,
			type: "view",
			viewId,
			isPinned: false,
			isDirty: false,
		};
		set((state) => ({
			tabs: [...state.tabs, newTab],
			activeTabId: id,
		}));
		return id;
	},

	removeTab: (id) => {
		const state = get();
		const tabIndex = state.tabs.findIndex((tab) => tab.id === id);
		if (tabIndex === -1) return;

		// Don't allow closing the last tab
		if (state.tabs.length === 1) {
			// If trying to close the last tab, open Welcome tab
			set({
				tabs: [
					{
						id: "welcome",
						title: "Welcome",
						icon: "Flame",
						isPinned: false,
						isDirty: false,
					},
				],
				activeTabId: "welcome",
			});
			return;
		}

		const newTabs = state.tabs.filter((tab) => tab.id !== id);
		let newActiveId = state.activeTabId;

		if (state.activeTabId === id) {
			if (newTabs.length > 0) {
				if (tabIndex < newTabs.length) {
					newActiveId = newTabs[tabIndex].id;
				} else {
					newActiveId = newTabs[newTabs.length - 1].id;
				}
			} else {
				// If no tabs remain, open Welcome tab
				set({
					tabs: [
						{
							id: "welcome",
							title: "Welcome",
							icon: "Flame",
							isPinned: false,
							isDirty: false,
						},
					],
					activeTabId: "welcome",
				});
				return;
			}
		}

		set({ tabs: newTabs, activeTabId: newActiveId });
	},

	setActiveTab: (id) => {
		set({ activeTabId: id });
	},

	updateTab: (id, updates) => {
		set((state) => ({
			tabs: state.tabs.map((tab) =>
				tab.id === id ? { ...tab, ...updates } : tab,
			),
		}));
	},

	closeAllTabs: () => {
		// Instead of closing all tabs, keep the Welcome tab open
		set({
			tabs: [
				{
					id: "welcome",
					title: "Welcome",
					icon: "Flame",
					isPinned: false,
					isDirty: false,
				},
			],
			activeTabId: "welcome",
		});
	},

	closeOtherTabs: (id) => {
		set((state) => ({
			tabs: state.tabs.filter((tab) => tab.id === id),
			activeTabId: id,
		}));
	},

	closeTabsToRight: (id) => {
		set((state) => {
			const index = state.tabs.findIndex((tab) => tab.id === id);
			const newTabs = state.tabs.slice(0, index + 1);
			const newActiveId = newTabs.find((tab) => tab.id === state.activeTabId)
				? state.activeTabId
				: id;
			return { tabs: newTabs, activeTabId: newActiveId };
		});
	},

	pinTab: (id) => {
		set((state) => ({
			tabs: state.tabs.map((tab) =>
				tab.id === id ? { ...tab, isPinned: !tab.isPinned } : tab,
			),
		}));
	},

	loadWorkspaceTabs: (workspaceTabs, activeId) => {
		if (workspaceTabs.length === 0) {
			// If no tabs in workspace, reset to welcome
			set({
				tabs: [
					{
						id: "welcome",
						title: "Welcome",
						icon: "Flame",
						isPinned: false,
						isDirty: false,
						type: "welcome",
					},
				],
				activeTabId: "welcome",
			});
		} else {
			// Load tabs from workspace
			set({
				tabs: workspaceTabs,
				activeTabId: activeId || workspaceTabs[0]?.id || null,
			});
		}
	},

	resetToWelcome: () => {
		set({
			tabs: [
				{
					id: "welcome",
					title: "Welcome",
					icon: "Flame",
					isPinned: false,
					isDirty: false,
					type: "welcome",
				},
			],
			activeTabId: "welcome",
		});
	},
}));
