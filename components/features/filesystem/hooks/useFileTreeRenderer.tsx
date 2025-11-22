"use client";

import { useCallback } from "react";
import type { FileSystemEntry } from "@/types/filesystem";
import { FileContextMenu } from "../FileContextMenu";
import { FileTreeItem } from "../FileTreeItem";

interface FileTreeRendererProps {
	entries: FileSystemEntry[];
	expandedFolders: Set<string>;
	selectedEntry: string | null;
	dragOverPath: string | null;
	clipboard: { entry: FileSystemEntry; operation: "copy" | "cut" } | null;
	handleNewFile: (entry: FileSystemEntry | null) => void;
	handleNewFolder: (entry: FileSystemEntry | null) => void;
	handleRename: (entry: FileSystemEntry) => void;
	handleDelete: (entry: FileSystemEntry) => void;
	handleCopy: (entry: FileSystemEntry) => void;
	handleCut: (entry: FileSystemEntry) => void;
	handlePaste: (entry: FileSystemEntry | null) => Promise<void>;
	triggerRefresh: () => void;
	handleDoubleClick: (entry: FileSystemEntry) => void;
	toggleFolder: (path: string) => void;
	loadChildEntries: (entry: FileSystemEntry) => Promise<void>;
	setSelectedEntry: (path: string | null) => void;
	setDragOverPath: React.Dispatch<React.SetStateAction<string | null>>;
	handleDrop: (sourcePath: string, destPath: string) => Promise<void>;
}

export function useFileTreeRenderer({
	expandedFolders,
	selectedEntry,
	dragOverPath,
	clipboard,
	handleNewFile,
	handleNewFolder,
	handleRename,
	handleDelete,
	handleCopy,
	handleCut,
	handlePaste,
	triggerRefresh,
	handleDoubleClick,
	toggleFolder,
	loadChildEntries,
	setSelectedEntry,
	setDragOverPath,
	handleDrop,
}: Omit<FileTreeRendererProps, "entries">) {
	const renderTree = useCallback(
		(items: FileSystemEntry[], level = 0): React.ReactNode[] => {
			return items.flatMap((entry) => {
				const isExpanded = expandedFolders.has(entry.path);
				const isSelected = selectedEntry === entry.path;
				const isDragOver = dragOverPath === entry.path;

				const node = (
					<FileContextMenu
						key={entry.path}
						entry={entry}
						onNewFile={() => handleNewFile(entry)}
						onNewFolder={() => handleNewFolder(entry)}
						onRename={() => handleRename(entry)}
						onDelete={() => handleDelete(entry)}
						onCopy={() => handleCopy(entry)}
						onCut={() => handleCut(entry)}
						onPaste={() => handlePaste(entry)}
						onRefresh={triggerRefresh}
						onOpenFile={() => handleDoubleClick(entry)}
						canPaste={clipboard !== null}
					>
						<FileTreeItem
							entry={entry}
							level={level}
							isExpanded={isExpanded}
							isSelected={isSelected}
							isDragOver={isDragOver}
							onToggle={() => {
								if (entry.is_directory) {
									toggleFolder(entry.path);
									if (!isExpanded && !entry.children) {
										loadChildEntries(entry);
									}
								}
							}}
							onSelect={() => setSelectedEntry(entry.path)}
							onDoubleClick={() => handleDoubleClick(entry)}
							onContextMenu={() => {
								setSelectedEntry(entry.path);
							}}
							onDragStart={(e) => {
								e.dataTransfer.effectAllowed = "copyMove";
								e.dataTransfer.setData("text/plain", entry.path);
							}}
							onDragOver={(e) => {
								if (entry.is_directory) {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setDragOverPath(entry.path);
								}
							}}
							onDrop={async (e) => {
								e.preventDefault();
								setDragOverPath(null);

								if (entry.is_directory) {
									const sourcePath = e.dataTransfer.getData("text/plain");
									if (sourcePath && sourcePath !== entry.path) {
										await handleDrop(sourcePath, entry.path);
									}
								}
							}}
							onDragLeave={() => {
								setDragOverPath(null);
							}}
						/>
					</FileContextMenu>
				);

				if (entry.is_directory && isExpanded && entry.children) {
					return [node, ...renderTree(entry.children, level + 1)];
				}

				return [node];
			});
		},
		[
			expandedFolders,
			selectedEntry,
			dragOverPath,
			clipboard,
			handleNewFile,
			handleNewFolder,
			handleRename,
			handleDelete,
			handleCopy,
			handleCut,
			handlePaste,
			triggerRefresh,
			handleDoubleClick,
			toggleFolder,
			loadChildEntries,
			setSelectedEntry,
			setDragOverPath,
			handleDrop,
		],
	);

	return renderTree;
}
