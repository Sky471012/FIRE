"use client";

import {
    ChevronRight,
    Code,
    Database,
    File,
    FileJson,
    FileSpreadsheet,
    FileText,
    Folder,
    FolderOpen,
    Image,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatFileSize } from "@/lib/filesystem-utils";
import { cn } from "@/lib/utils";
import type { FileSystemEntry } from "@/types/filesystem";

interface FileTreeItemProps {
    entry: FileSystemEntry;
    level: number;
    isExpanded: boolean;
    isSelected: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onDoubleClick?: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    isDragOver?: boolean;
}

function getFileIcon(fileName: string, isDirectory: boolean) {
    if (isDirectory) {
        return { icon: Folder, color: "text-blue-500" };
    }

    const ext = fileName.split(".").pop()?.toLowerCase();

    const iconMap: Record<string, { icon: typeof File; color: string }> = {
        // Images
        png: { icon: Image, color: "text-purple-500" },
        jpg: { icon: Image, color: "text-purple-500" },
        jpeg: { icon: Image, color: "text-purple-500" },
        gif: { icon: Image, color: "text-purple-500" },
        svg: { icon: Image, color: "text-purple-500" },
        webp: { icon: Image, color: "text-purple-500" },

        // Code
        ts: { icon: Code, color: "text-blue-400" },
        tsx: { icon: Code, color: "text-blue-400" },
        js: { icon: Code, color: "text-yellow-500" },
        jsx: { icon: Code, color: "text-yellow-500" },
        py: { icon: Code, color: "text-green-500" },
        rs: { icon: Code, color: "text-orange-600" },
        go: { icon: Code, color: "text-cyan-500" },
        java: { icon: Code, color: "text-red-500" },
        cpp: { icon: Code, color: "text-blue-600" },
        c: { icon: Code, color: "text-blue-600" },
        html: { icon: Code, color: "text-orange-500" },
        css: { icon: Code, color: "text-blue-500" },
        scss: { icon: Code, color: "text-pink-500" },

        // Data
        json: { icon: FileJson, color: "text-yellow-600" },
        xml: { icon: FileJson, color: "text-green-600" },
        yaml: { icon: FileJson, color: "text-purple-600" },
        yml: { icon: FileJson, color: "text-purple-600" },
        toml: { icon: FileJson, color: "text-orange-600" },

        // Spreadsheet & Data
        csv: { icon: FileSpreadsheet, color: "text-green-600" },
        xlsx: { icon: FileSpreadsheet, color: "text-green-600" },
        xls: { icon: FileSpreadsheet, color: "text-green-600" },
        parquet: { icon: Database, color: "text-blue-600" },
        db: { icon: Database, color: "text-blue-600" },
        sqlite: { icon: Database, color: "text-blue-600" },

        // Text
        txt: { icon: FileText, color: "text-gray-500" },
        md: { icon: FileText, color: "text-gray-500" },
        log: { icon: FileText, color: "text-gray-500" },
    };

    return iconMap[ext || ""] || { icon: File, color: "text-gray-500" };
}

export function FileTreeItem({
    entry,
    level,
    isExpanded,
    isSelected,
    onToggle,
    onSelect,
    onDoubleClick,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    onDragLeave,
    isDragOver = false,
}: FileTreeItemProps) {
    const { icon: Icon, color } = getFileIcon(entry.name, entry.is_directory);
    const DirectoryIcon = isExpanded ? FolderOpen : Folder;

    return (
        <div
            role="treeitem"
            aria-selected={isSelected}
            tabIndex={0}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
            onContextMenu={(e) => {
                console.log("[FileTreeItem] onContextMenu called for:", entry.name);
                e.stopPropagation(); // Prevent bubbling to parent
                onContextMenu(e);
            }}
            className={cn(
                "group flex items-center gap-1 px-2 py-0.5 hover:bg-accent rounded transition-all cursor-pointer select-none",
                isSelected && "bg-accent ring-1 ring-primary/20",
                isDragOver &&
                    entry.is_directory &&
                    "bg-primary/10 border-2 border-primary border-dashed",
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
            {entry.is_directory ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className="p-0 hover:bg-accent/50 rounded"
                >
                    <ChevronRight
                        className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90",
                        )}
                    />
                </button>
            ) : (
                <div className="w-3.5" />
            )}

            <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onSelect}
                        onDoubleClick={onDoubleClick}
                        className="flex items-center gap-2 flex-1 min-w-0 bg-transparent border-0 p-0 text-left"
                    >
                        {entry.is_directory ? (
                            <DirectoryIcon className={cn("h-4 w-4 flex-shrink-0", color)} />
                        ) : (
                            <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                        )}
                        <span className="text-xs truncate">{entry.name}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                    <div className="space-y-1">
                        <div className="font-semibold">{entry.name}</div>
                        {!entry.is_directory && entry.size !== undefined && (
                            <div className="text-muted-foreground">
                                Size: {formatFileSize(entry.size)}
                            </div>
                        )}
                        {entry.modified && (
                            <div className="text-muted-foreground">
                                Modified: {formatDate(entry.modified)}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
