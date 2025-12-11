import { useEffect } from "react";
import type { FileSystemEntry } from "@/types/filesystem";

interface UseFileExplorerKeyboardProps {
    selectedEntry: string | null;
    entries: FileSystemEntry[];
    clipboard: { entry: FileSystemEntry; operation: "copy" | "cut" } | null;
    findEntry: (items: FileSystemEntry[], path: string) => FileSystemEntry | null;
    handleDelete: (entry: FileSystemEntry) => void;
    handleRename: (entry: FileSystemEntry) => void;
    handleCopy: (entry: FileSystemEntry) => void;
    handleCut: (entry: FileSystemEntry) => void;
    handlePaste: (entry: FileSystemEntry | null) => Promise<void>;
}

export function useFileExplorerKeyboard({
    selectedEntry,
    entries,
    clipboard,
    findEntry,
    handleDelete,
    handleRename,
    handleCopy,
    handleCut,
    handlePaste,
}: UseFileExplorerKeyboardProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if no input is focused
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA"
            ) {
                return;
            }

            if (selectedEntry) {
                const selected = findEntry(entries, selectedEntry);
                if (!selected) return;

                // Delete key
                if (e.key === "Delete") {
                    e.preventDefault();
                    handleDelete(selected);
                }

                // F2 key for rename
                if (e.key === "F2") {
                    e.preventDefault();
                    handleRename(selected);
                }

                // Ctrl+C for copy
                if (e.ctrlKey && e.key === "c") {
                    e.preventDefault();
                    handleCopy(selected);
                }

                // Ctrl+X for cut
                if (e.ctrlKey && e.key === "x") {
                    e.preventDefault();
                    handleCut(selected);
                }

                // Ctrl+V for paste
                if (e.ctrlKey && e.key === "v" && clipboard) {
                    e.preventDefault();
                    if (selected.is_directory) {
                        handlePaste(selected);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        selectedEntry,
        entries,
        clipboard,
        findEntry,
        handleDelete,
        handleRename,
        handleCopy,
        handleCut,
        handlePaste,
    ]);
}
