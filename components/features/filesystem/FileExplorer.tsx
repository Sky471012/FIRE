"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useFileSystem } from "@/hooks/use-filesystem";
import { useProject } from "@/hooks/use-project";
import { fileSystemApi } from "@/lib/filesystem-api";
import type { FileSystemEntry } from "@/types/filesystem";
import { FileContextMenu } from "./FileContextMenu";
import { FileExplorerDialogs } from "./FileExplorerDialogs";
import { FileExplorerEmpty } from "./FileExplorerEmpty";
import { useFileExplorerDialogs } from "./hooks/useFileExplorerDialogs";
import { useFileExplorerHandlers } from "./hooks/useFileExplorerHandlers";
import { useFileExplorerKeyboard } from "./hooks/useFileExplorerKeyboard";
import { useFileTreeRenderer } from "./hooks/useFileTreeRenderer";

export function FileExplorer() {
	const {
		rootPath,
		setRootPath,
		expandedFolders,
		toggleFolder,
		selectedEntry,
		setSelectedEntry,
		refreshTrigger,
		triggerRefresh,
		showHiddenFiles,
	} = useFileSystem();

	const { recentProjects } = useProject();

	const [entries, setEntries] = useState<FileSystemEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [contextEntry, setContextEntry] = useState<FileSystemEntry | null>(
		null,
	);
	const [dragOverPath, setDragOverPath] = useState<string | null>(null);

	// Dialog states
	const [showNewFileDialog, setShowNewFileDialog] = useState(false);
	const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [dialogInput, setDialogInput] = useState("");
	const [targetPath, setTargetPath] = useState("");

	// Helper function to find entry by path
	const findEntry = useCallback(
		(items: FileSystemEntry[], path: string): FileSystemEntry | null => {
			for (const item of items) {
				if (item.path === path) return item;
				if (item.children) {
					const found = findEntry(item.children, path);
					if (found) return found;
				}
			}
			return null;
		},
		[],
	);

	// Helper to update entry in tree
	const updateEntryInTree = useCallback(
		(
			items: FileSystemEntry[],
			path: string,
			updater: (entry: FileSystemEntry) => void,
		): FileSystemEntry[] => {
			return items.map((item) => {
				if (item.path === path) {
					updater(item);
					return { ...item };
				}
				if (item.children) {
					return {
						...item,
						children: updateEntryInTree(item.children, path, updater),
					};
				}
				return item;
			});
		},
		[],
	);

	// Load directory contents
	const loadDirectory = useCallback(
		async (path: string) => {
			try {
				setLoading(true);
				let result = await fileSystemApi.readDirectory(path);

				if (!showHiddenFiles) {
					result = result.filter((entry) => !entry.name.startsWith("."));
				}

				setEntries(result);
			} catch (error) {
				toast.error(`Failed to load directory: ${error}`);
				setEntries([]);
			} finally {
				setLoading(false);
			}
		},
		[showHiddenFiles],
	);

	// Use extracted handlers
	const {
		handleNewFile,
		handleNewFolder,
		handleRename,
		handleDelete,
		handleCopy,
		handleCut,
		handlePaste,
		handleDrop,
		handleDoubleClick,
		loadChildEntries,
		clipboard,
	} = useFileExplorerHandlers(
		rootPath,
		entries,
		updateEntryInTree,
		setEntries,
		setContextEntry,
		setTargetPath,
		setDialogInput,
		setShowNewFileDialog,
		setShowNewFolderDialog,
		setShowRenameDialog,
		setShowDeleteDialog,
	);

	// Use extracted dialog handlers
	const { confirmNewFile, confirmNewFolder, confirmRename, confirmDelete } =
		useFileExplorerDialogs(
			targetPath,
			dialogInput,
			contextEntry,
			setShowNewFileDialog,
			setShowNewFolderDialog,
			setShowRenameDialog,
			setShowDeleteDialog,
			setDialogInput,
		);

	// Use tree renderer
	const renderTree = useFileTreeRenderer({
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
	});

	// Use keyboard shortcuts
	useFileExplorerKeyboard({
		selectedEntry,
		entries,
		clipboard,
		findEntry,
		handleDelete,
		handleRename,
		handleCopy,
		handleCut,
		handlePaste,
	});

	// Auto-load most recent project on mount
	useEffect(() => {
		if (!rootPath && recentProjects.length > 0) {
			const mostRecent = [...recentProjects].sort(
				(a, b) =>
					new Date(b.last_accessed).getTime() -
					new Date(a.last_accessed).getTime(),
			)[0];

			if (mostRecent?.path) {
				setRootPath(mostRecent.path);
			}
		}
	}, [recentProjects, rootPath, setRootPath]);

	// Load root directory
	useEffect(() => {
		if (rootPath) {
			loadDirectory(rootPath);
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: refreshTrigger is intentionally used to force reload
	}, [rootPath, loadDirectory, refreshTrigger]);

	if (!rootPath) {
		return <FileExplorerEmpty />;
	}

	return (
		<>
			<ScrollArea className="h-full">
				<FileContextMenu
					entry={null}
					onNewFile={() => handleNewFile(null)}
					onNewFolder={() => handleNewFolder(null)}
					onRename={() => {}}
					onDelete={() => {}}
					onCopy={() => {}}
					onCut={() => {}}
					onPaste={() => handlePaste(null)}
					onRefresh={triggerRefresh}
					canPaste={clipboard !== null}
				>
					<div
						className="p-2 space-y-0.5"
						onContextMenu={(e) => {
							console.log(
								"[FileExplorer] Context menu triggered on empty space",
							);
							// Only set to null if target is this div or empty area
							if (e.currentTarget === e.target) {
								setContextEntry(null);
								console.log(
									"[FileExplorer] Context entry set to null (empty space)",
								);
							}
						}}
					>
						{loading ? (
							<div className="flex items-center justify-center p-4">
								<Spinner className="h-5 w-5" />
							</div>
						) : entries.length === 0 ? (
							<div className="text-xs text-muted-foreground p-2">
								Empty folder
							</div>
						) : (
							renderTree(entries)
						)}
					</div>
				</FileContextMenu>
			</ScrollArea>

			<FileExplorerDialogs
				showNewFileDialog={showNewFileDialog}
				showNewFolderDialog={showNewFolderDialog}
				showRenameDialog={showRenameDialog}
				showDeleteDialog={showDeleteDialog}
				dialogInput={dialogInput}
				contextEntry={contextEntry}
				setShowNewFileDialog={setShowNewFileDialog}
				setShowNewFolderDialog={setShowNewFolderDialog}
				setShowRenameDialog={setShowRenameDialog}
				setShowDeleteDialog={setShowDeleteDialog}
				setDialogInput={setDialogInput}
				confirmNewFile={confirmNewFile}
				confirmNewFolder={confirmNewFolder}
				confirmRename={confirmRename}
				confirmDelete={confirmDelete}
			/>
		</>
	);
}
