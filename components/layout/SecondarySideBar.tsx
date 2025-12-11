"use client";

import { useTabs } from "@/hooks/use-tabs";
import { FluxNodePalette } from "@/components/features/flux/FluxNodePalette";

export function SecondarySideBar() {
    const { tabs, activeTabId } = useTabs();
    const activeTab = tabs.find((t) => t.id === activeTabId);

    if (activeTab?.type === "flux") {
        return <FluxNodePalette />;
    }

    return null;
}
