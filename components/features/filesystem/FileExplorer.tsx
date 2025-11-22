"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useFileSystem } from "@/hooks/use-filesystem";
import { useProject } from "@/hooks/use-project";
import { fileSystemApi } from "@/lib/filesystem-api";
import type { FileSystemEntry } from "@/types/filesystem";
import { FileContextMenu } from "./FileContextMenu";
import { FileExplorerEmpty } from "./FileExplorerEmpty";
import { FileTreeItem } from "./FileTreeItem";

export function FileExplorer() {
	const {
		rootPath,
		setRootPath,
		expandedFolders,
		toggleFolder,
		expandFolder,
		selectedEntry,
		setSelectedEntry,
		clipboard,
		setClipboard,
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

				// Filter hidden files if needed
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

	// Load children of a folder
	const loadChildEntries = useCallback(
		async (parent: FileSystemEntry) => {
			try {
				let children = await fileSystemApi.readDirectory(parent.path);

				// Filter hidden files if needed
				if (!showHiddenFiles) {
					children = children.filter((entry) => !entry.name.startsWith("."));
				}

				const updated = updateEntryInTree(entries, parent.path, (entry) => {
					entry.children = children;
				});
				setEntries(updated);
			} catch (error) {
				toast.error(`Failed to load folder: ${error}`);
			}
		},
		[entries, showHiddenFiles, updateEntryInTree],
	);

	// Context menu actions
	const handleNewFile = useCallback(
		(entry: FileSystemEntry | null) => {
			const path = entry?.is_directory ? entry.path : rootPath || "";
			setTargetPath(path);
			setDialogInput("untitled.txt");
			setShowNewFileDialog(true);
			setContextEntry(entry);
		},
		[rootPath],
	);

	const handleNewFolder = useCallback(
		(entry: FileSystemEntry | null) => {
			const path = entry?.is_directory ? entry.path : rootPath || "";
			setTargetPath(path);
			setDialogInput("New Folder");
			setShowNewFolderDialog(true);
			setContextEntry(entry);
		},
		[rootPath],
	);

	const handleRename = useCallback((entry: FileSystemEntry) => {
		setDialogInput(entry.name);
		setShowRenameDialog(true);
		setContextEntry(entry);
	}, []);

	const handleDelete = useCallback((entry: FileSystemEntry) => {
		setShowDeleteDialog(true);
		setContextEntry(entry);
	}, []);

	const handleCopy = useCallback(
		(entry: FileSystemEntry) => {
			setClipboard({ entry: entry, operation: "copy" });
			toast.success("Copied to clipboard");
			setContextEntry(entry);
		},
		[setClipboard],
	);

	const handleCut = useCallback(
		(entry: FileSystemEntry) => {
			setClipboard({ entry: entry, operation: "cut" });
			toast.success("Cut to clipboard");
			setContextEntry(entry);
		},
		[setClipboard],
	);

	const handlePaste = useCallback(
		async (entry: FileSystemEntry | null) => {
			if (!clipboard) return;

			// Determine target path: if context entry is a folder, use it; otherwise use root
			const targetPath = entry?.is_directory ? entry.path : rootPath;

			if (!targetPath) return;

			try {
				if (clipboard.operation === "copy") {
					await fileSystemApi.copyEntry(clipboard.entry.path, targetPath);
					toast.success("Item copied successfully");
				} else {
					await fileSystemApi.moveEntry(clipboard.entry.path, targetPath);
					toast.success("Item moved successfully");
					setClipboard(null);
				}
				triggerRefresh();
			} catch (error) {
				toast.error(`Failed to paste: ${error}`);
			}
			setContextEntry(entry);
		},
		[clipboard, rootPath, setClipboard, triggerRefresh],
	);

	// Handle drag and drop
	const handleDrop = useCallback(
		async (sourcePath: string, destPath: string) => {
			try {
				await fileSystemApi.moveEntry(sourcePath, destPath);
				toast.success("Item moved successfully");
				triggerRefresh();
			} catch (error) {
				toast.error(`Failed to move item: ${error}`);
			}
		},
		[triggerRefresh],
	);

	// Handle double-click to expand folder or open file
	const handleDoubleClick = useCallback(
		(entry: FileSystemEntry) => {
			if (entry.is_directory) {
				const isExpanded = expandedFolders.has(entry.path);
				toggleFolder(entry.path);
				if (!isExpanded && !entry.children) {
					loadChildEntries(entry);
				}
			} else {
				// Open file - you can implement file opening logic here
				toast.info(`Opening file: ${entry.name}`);
				// TODO: Implement file opening in a viewer/editor
			}
		},
		[expandedFolders, toggleFolder, loadChildEntries],
	);

	// Auto-load most recent project on mount
	useEffect(() => {
		if (!rootPath && recentProjects.length > 0) {
			// Sort by last_accessed and get the most recent
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
	}, [rootPath, loadDirectory, refreshTrigger]);

	// Keyboard shortcuts
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
		handleDelete,
		handleRename,
		handleCopy,
		handleCut,
		handlePaste,
	]);

	// Recursively render tree
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
			toggleFolder,
			setSelectedEntry,
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
			loadChildEntries,
			handleDrop,
		],
	);

	// Dialog confirmations
	const confirmNewFile = async () => {
		try {
			await fileSystemApi.createFile(targetPath, dialogInput);
			toast.success("File created successfully");
			triggerRefresh();
			if (contextEntry?.is_directory) {
				expandFolder(contextEntry.path);
			}
		} catch (error) {
			toast.error(`Failed to create file: ${error}`);
		}
		setShowNewFileDialog(false);
		setDialogInput("");
	};

	const confirmNewFolder = async () => {
		try {
			await fileSystemApi.createFolder(targetPath, dialogInput);
			toast.success("Folder created successfully");
			triggerRefresh();
			if (contextEntry?.is_directory) {
				expandFolder(contextEntry.path);
			}
		} catch (error) {
			toast.error(`Failed to create folder: ${error}`);
		}
		setShowNewFolderDialog(false);
		setDialogInput("");
	};

	const confirmRename = async () => {
		if (!contextEntry) return;

		try {
			await fileSystemApi.renameEntry(contextEntry.path, dialogInput);
			toast.success("Renamed successfully");
			triggerRefresh();
		} catch (error) {
			toast.error(`Failed to rename: ${error}`);
		}
		setShowRenameDialog(false);
		setDialogInput("");
	};

	const confirmDelete = async () => {
		if (!contextEntry) return;

		try {
			if (contextEntry.is_directory) {
				await fileSystemApi.deleteFolder(contextEntry.path);
			} else {
				await fileSystemApi.deleteFile(contextEntry.path);
			}
			toast.success("Deleted successfully");
			triggerRefresh();
		} catch (error) {
			toast.error(`Failed to delete: ${error}`);
		}
		setShowDeleteDialog(false);
	};

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

			{/* New File Dialog */}
			<AlertDialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Create New File</AlertDialogTitle>
						<AlertDialogDescription>
							Enter the name for the new file
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Input
						value={dialogInput}
						onChange={(e) => setDialogInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								confirmNewFile();
							}
						}}
						placeholder="filename.txt"
						autoFocus
					/>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmNewFile}>
							Create
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* New Folder Dialog */}
			<AlertDialog
				open={showNewFolderDialog}
				onOpenChange={setShowNewFolderDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Create New Folder</AlertDialogTitle>
						<AlertDialogDescription>
							Enter the name for the new folder
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Input
						value={dialogInput}
						onChange={(e) => setDialogInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								confirmNewFolder();
							}
						}}
						placeholder="Folder Name"
						autoFocus
					/>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmNewFolder}>
							Create
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Rename Dialog */}
			<AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rename</AlertDialogTitle>
						<AlertDialogDescription>
							Enter the new name for {contextEntry?.name}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Input
						value={dialogInput}
						onChange={(e) => setDialogInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								confirmRename();
							}
						}}
						placeholder="New name"
						autoFocus
					/>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmRename}>
							Rename
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {contextEntry?.name}?</AlertDialogTitle>
						<AlertDialogDescription>
							{contextEntry?.is_directory
								? "This will permanently delete this folder and all its contents. This action cannot be undone."
								: "This will permanently delete this file. This action cannot be undone."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
