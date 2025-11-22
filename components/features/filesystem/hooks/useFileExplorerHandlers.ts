import { useCallback } from "react";
import { toast } from "sonner";
import { useFileSystem } from "@/hooks/use-filesystem";
import { fileSystemApi } from "@/lib/filesystem-api";
import type { FileSystemEntry } from "@/types/filesystem";

export function useFileExplorerHandlers(
	rootPath: string | null,
	entries: FileSystemEntry[],
	updateEntryInTree: (
		items: FileSystemEntry[],
		path: string,
		updater: (entry: FileSystemEntry) => void,
	) => FileSystemEntry[],
	setEntries: React.Dispatch<React.SetStateAction<FileSystemEntry[]>>,
	setContextEntry: React.Dispatch<React.SetStateAction<FileSystemEntry | null>>,
	setTargetPath: React.Dispatch<React.SetStateAction<string>>,
	setDialogInput: React.Dispatch<React.SetStateAction<string>>,
	setShowNewFileDialog: React.Dispatch<React.SetStateAction<boolean>>,
	setShowNewFolderDialog: React.Dispatch<React.SetStateAction<boolean>>,
	setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>,
	setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>,
) {
	const {
		clipboard,
		setClipboard,
		triggerRefresh,
		expandedFolders,
		toggleFolder,
		showHiddenFiles,
	} = useFileSystem();

	const loadChildEntries = useCallback(
		async (parent: FileSystemEntry) => {
			try {
				let children = await fileSystemApi.readDirectory(parent.path);

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
		[entries, showHiddenFiles, updateEntryInTree, setEntries],
	);

	const handleNewFile = useCallback(
		(entry: FileSystemEntry | null) => {
			const path = entry?.is_directory ? entry.path : rootPath || "";
			setTargetPath(path);
			setDialogInput("untitled.txt");
			setShowNewFileDialog(true);
			setContextEntry(entry);
		},
		[
			rootPath,
			setTargetPath,
			setDialogInput,
			setShowNewFileDialog,
			setContextEntry,
		],
	);

	const handleNewFolder = useCallback(
		(entry: FileSystemEntry | null) => {
			const path = entry?.is_directory ? entry.path : rootPath || "";
			setTargetPath(path);
			setDialogInput("New Folder");
			setShowNewFolderDialog(true);
			setContextEntry(entry);
		},
		[
			rootPath,
			setTargetPath,
			setDialogInput,
			setShowNewFolderDialog,
			setContextEntry,
		],
	);

	const handleRename = useCallback(
		(entry: FileSystemEntry) => {
			setDialogInput(entry.name);
			setShowRenameDialog(true);
			setContextEntry(entry);
		},
		[setDialogInput, setShowRenameDialog, setContextEntry],
	);

	const handleDelete = useCallback(
		(entry: FileSystemEntry) => {
			setShowDeleteDialog(true);
			setContextEntry(entry);
		},
		[setShowDeleteDialog, setContextEntry],
	);

	const handleCopy = useCallback(
		(entry: FileSystemEntry) => {
			setClipboard({ entry: entry, operation: "copy" });
			toast.success("Copied to clipboard");
			setContextEntry(entry);
		},
		[setClipboard, setContextEntry],
	);

	const handleCut = useCallback(
		(entry: FileSystemEntry) => {
			setClipboard({ entry: entry, operation: "cut" });
			toast.success("Cut to clipboard");
			setContextEntry(entry);
		},
		[setClipboard, setContextEntry],
	);

	const handlePaste = useCallback(
		async (entry: FileSystemEntry | null) => {
			if (!clipboard) return;

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
		[clipboard, rootPath, setClipboard, triggerRefresh, setContextEntry],
	);

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

	const handleDoubleClick = useCallback(
		(entry: FileSystemEntry) => {
			if (entry.is_directory) {
				const isExpanded = expandedFolders.has(entry.path);
				toggleFolder(entry.path);
				if (!isExpanded && !entry.children) {
					loadChildEntries(entry);
				}
			} else {
				toast.info(`Opening file: ${entry.name}`);
				// TODO: Implement file opening in a viewer/editor
			}
		},
		[expandedFolders, toggleFolder, loadChildEntries],
	);

	return {
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
	};
}
