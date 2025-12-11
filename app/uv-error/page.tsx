"use client";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AlertCircle, ExternalLink } from "lucide-react";
import { ChildWindowControls } from "@/components/features/window/ChildWindowControls";
import { Button } from "@/components/ui/button";

export default function UvErrorPage() {
    const handleClose = () => {
        const window = getCurrentWebviewWindow();
        window.close();
    };

    const handleOpenLink = () => {
        // Open the UV installation link in the default browser
        window.open("https://docs.astral.sh/uv/getting-started/installation/", "_blank");
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Title Bar for Child Window */}
            <div
                data-tauri-drag-region
                className="flex items-center justify-between h-9 bg-destructive/10 border-b border-destructive/20 pl-3"
            >
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                        UV Installation Required
                    </span>
                </div>
                <ChildWindowControls />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-destructive/10 p-2 mt-1">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold mb-2">UV Package Manager Required</h1>
                            <p className="text-sm text-muted-foreground">
                                This application requires UV (a fast Python package manager) to be
                                installed on your system.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                        <h3 className="font-medium text-sm">What is UV?</h3>
                        <p className="text-sm text-muted-foreground">
                            UV is an extremely fast Python package and project manager, written in
                            Rust. It's required for managing the Python dependencies used by this
                            application.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-medium text-sm">How to install UV:</h3>
                        <Button
                            onClick={handleOpenLink}
                            variant="outline"
                            className="w-full justify-start gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open Installation Guide
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            This will open the official UV installation documentation in your
                            browser.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <Button onClick={handleClose} className="w-full" variant="default">
                            OK
                        </Button>
                    </div>

                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            <strong>Note:</strong> After installing UV, please restart this
                            application for the changes to take effect.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
