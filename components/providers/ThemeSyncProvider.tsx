"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/use-settings";

/**
 * Component that syncs the theme from settings to next-themes on initial load only
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
    const { settings, loading } = useSettings();
    const { setTheme } = useTheme();
    const hasInitialized = useRef(false);

    // Sync theme from settings only on initial load
    useEffect(() => {
        if (!loading && settings?.appearance?.theme && !hasInitialized.current) {
            setTheme(settings.appearance.theme);
            hasInitialized.current = true;
        }
    }, [loading, settings?.appearance?.theme, setTheme]);

    return <>{children}</>;
}
