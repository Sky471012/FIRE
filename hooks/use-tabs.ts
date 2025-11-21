import type React from "react";
import { create } from "zustand";

export interface Tab {
	id: string;
	title: string;
	icon?: string;
	isDirty?: boolean;
	isPinned?: boolean;
	content?: React.ReactNode;
}

interface TabsState {
	tabs: Tab[];
	activeTabId: string | null;
	addTab: (tab: Omit<Tab, "id">) => void;
	removeTab: (id: string) => void;
	setActiveTab: (id: string) => void;
	updateTab: (id: string, updates: Partial<Tab>) => void;
	closeAllTabs: () => void;
	closeOtherTabs: (id: string) => void;
	closeTabsToRight: (id: string) => void;
	pinTab: (id: string) => void;
}

export const useTabs = create<TabsState>((set, get) => ({
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

	addTab: (tab) => {
		const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newTab = { ...tab, id };
		set((state) => ({
			tabs: [...state.tabs, newTab],
			activeTabId: id,
		}));
	},

	removeTab: (id) => {
		const state = get();
		const tabIndex = state.tabs.findIndex((tab) => tab.id === id);
		if (tabIndex === -1) return;

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
				newActiveId = null;
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
		set({ tabs: [], activeTabId: null });
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
}));
