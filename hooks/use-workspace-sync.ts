import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useProject } from "./use-project";
import { useTabs } from "./use-tabs";

interface WorkspaceState {
    last_open_project_path: string | null;
    open_tabs: Array<{
        id: string;
        title: string;
        icon?: string;
        isDirty?: boolean;
        isPinned?: boolean;
        filePath?: string;
        isBinary?: boolean;
        type?: "file" | "view" | "welcome" | "flux";
        viewId?: string;
    }>;
    active_tab_id: string | null;
    panel_layout_state?: Record<string, unknown>;
    sidebar_collapsed: boolean;
}

/**
 * Hook to synchronize workspace state (tabs, layout) with the backend
 * when the project changes. This ensures that when you switch projects,
 * the tabs and layout from the new project are loaded.
 */
export function useWorkspaceSync() {
    const { currentProjectPath } = useProject();
    const { loadWorkspaceTabs, resetToWelcome } = useTabs();

    useEffect(() => {
        const loadWorkspace = async () => {
            if (!currentProjectPath) {
                // No project open, reset to welcome tab
                resetToWelcome();
                return;
            }

            try {
                // Load workspace state from backend
                const workspace = await invoke<WorkspaceState>("get_workspace_state");

                console.log("[Workspace Sync] Loaded workspace:", {
                    project: currentProjectPath,
                    tabCount: workspace.open_tabs?.length || 0,
                    tabs: workspace.open_tabs?.map((t) => ({
                        id: t.id,
                        title: t.title,
                        type: t.type,
                    })),
                });

                // Load tabs from workspace
                if (workspace.open_tabs && workspace.open_tabs.length > 0) {
                    loadWorkspaceTabs(workspace.open_tabs, workspace.active_tab_id);
                } else {
                    // No tabs saved, reset to welcome
                    console.log("[Workspace Sync] No tabs in workspace, resetting to welcome");
                    resetToWelcome();
                }
            } catch (error) {
                console.error("Failed to load workspace state:", error);
                // On error, reset to welcome tab
                resetToWelcome();
            }
        };

        loadWorkspace();
    }, [currentProjectPath, loadWorkspaceTabs, resetToWelcome]);

    // Save workspace state periodically and on project switch
    useEffect(() => {
        if (!currentProjectPath) return;

        const saveWorkspace = async () => {
            try {
                const tabs = useTabs.getState().tabs;
                const activeTabId = useTabs.getState().activeTabId;

                console.log("[Workspace Sync] Saving workspace:", {
                    project: currentProjectPath,
                    tabCount: tabs.length,
                    tabs: tabs.map((t) => ({ id: t.id, title: t.title, type: t.type })),
                });

                const workspace: WorkspaceState = {
                    last_open_project_path: currentProjectPath,
                    open_tabs: tabs,
                    active_tab_id: activeTabId,
                    sidebar_collapsed: false,
                };

                await invoke("save_workspace_state", { workspace });
                console.log("[Workspace Sync] Workspace saved successfully");
            } catch (error) {
                console.error("Failed to save workspace state:", error);
            }
        };

        // Save on project change (after a small delay to debounce)
        const timer = setTimeout(saveWorkspace, 500);

        return () => clearTimeout(timer);
    }, [currentProjectPath]);

    // Save workspace state when tabs change
    useEffect(() => {
        if (!currentProjectPath) return;

        let saveTimer: NodeJS.Timeout;

        const unsubscribe = useTabs.subscribe((state) => {
            // Clear existing timer
            if (saveTimer) {
                clearTimeout(saveTimer);
            }

            // Debounce saves
            saveTimer = setTimeout(async () => {
                try {
                    console.log("[Workspace Sync] Tabs changed, saving:", {
                        tabCount: state.tabs.length,
                        tabs: state.tabs.map((t) => ({
                            id: t.id,
                            title: t.title,
                            type: t.type,
                        })),
                    });

                    const workspace: WorkspaceState = {
                        last_open_project_path: currentProjectPath,
                        open_tabs: state.tabs,
                        active_tab_id: state.activeTabId,
                        sidebar_collapsed: false,
                    };

                    await invoke("save_workspace_state", { workspace });
                    console.log("[Workspace Sync] Auto-save complete");
                } catch (error) {
                    console.error("[Workspace Sync] Auto-save failed:", error);
                }
            }, 1000);
        });

        return () => {
            if (saveTimer) {
                clearTimeout(saveTimer);
            }
            unsubscribe();
        };
    }, [currentProjectPath]);
}
