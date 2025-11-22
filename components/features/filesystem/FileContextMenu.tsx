"use client";

import { invoke } from "@tauri-apps/api/core";
import {
	Copy,
	Edit,
	FilePlus,
	FileText,
	FolderPlus,
	RefreshCw,
	Scissors,
	Send,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileSystemEntry } from "@/types/filesystem";

interface FileContextMenuProps {
	children: React.ReactNode;
	entry: FileSystemEntry | null;
	onNewFile: () => void;
	onNewFolder: () => void;
	onRename: () => void;
	onDelete: () => void;
	onCopy: () => void;
	onCut: () => void;
	onPaste: () => void;
	onRefresh: () => void;
	onOpenFile?: () => void;
	canPaste: boolean;
}

export function FileContextMenu({
	children,
	entry,
	onNewFile,
	onNewFolder,
	onRename,
	onDelete,
	onCopy,
	onCut,
	onPaste,
	onRefresh,
	onOpenFile,
	canPaste,
}: FileContextMenuProps) {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	console.log(
		"[FileContextMenu] Rendering with entry:",
		entry,
		"canPaste:",
		canPaste,
		"isLoggedIn:",
		isLoggedIn,
	);

	// Check if user is logged in on mount
	useEffect(() => {
		checkLoginStatus();
	}, []);

	// Re-check login status when context menu opens
	useEffect(() => {
		if (isOpen) {
			checkLoginStatus();
		}
	}, [isOpen]);

	const checkLoginStatus = async () => {
		try {
			const user = await invoke<string | null>("get_current_user");
			console.log("[FileContextMenu] Current user:", user);
			setIsLoggedIn(user !== null);
		} catch (error) {
			console.error("[FileContextMenu] Failed to check login:", error);
			setIsLoggedIn(false);
		}
	};

	const handleSendToUser = async () => {
		if (!entry || entry.is_directory) {
			toast.error("Please select a file to send");
			return;
		}

		// Simple prompt for recipient username
		const recipient = window.prompt("Enter recipient username:");
		if (!recipient || !recipient.trim()) {
			return;
		}

		try {
			const result = await invoke<string>("send_file_to_user", {
				recipient: recipient.trim(),
				filePath: entry.path,
			});
			toast.success(result);
		} catch (error) {
			toast.error(`Failed to send file: ${error}`);
		}
	};

	return (
		<ContextMenu onOpenChange={setIsOpen}>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				{entry && !entry.is_directory && onOpenFile && (
					<>
						<ContextMenuItem onClick={onOpenFile}>
							<FileText className="mr-2 h-4 w-4" />
							<span>Open</span>
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}

				{(!entry || entry.is_directory) && (
					<>
						<ContextMenuItem onClick={onNewFile}>
							<FilePlus className="mr-2 h-4 w-4" />
							<span>New File</span>
						</ContextMenuItem>
						<ContextMenuItem onClick={onNewFolder}>
							<FolderPlus className="mr-2 h-4 w-4" />
							<span>New Folder</span>
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}

				{entry && (
					<>
						<ContextMenuItem onClick={onRename}>
							<Edit className="mr-2 h-4 w-4" />
							<span>Rename</span>
						</ContextMenuItem>
						<ContextMenuItem onClick={onCopy}>
							<Copy className="mr-2 h-4 w-4" />
							<span>Copy</span>
						</ContextMenuItem>
						<ContextMenuItem onClick={onCut}>
							<Scissors className="mr-2 h-4 w-4" />
							<span>Cut</span>
						</ContextMenuItem>
						{!entry.is_directory && isLoggedIn && (
							<>
								<ContextMenuSeparator />
								<ContextMenuItem onClick={handleSendToUser}>
									<Send className="mr-2 h-4 w-4" />
									<span>Send to User...</span>
								</ContextMenuItem>
							</>
						)}
						<ContextMenuSeparator />
						<ContextMenuItem onClick={onDelete} className="text-destructive">
							<Trash2 className="mr-2 h-4 w-4" />
							<span>Delete</span>
						</ContextMenuItem>
					</>
				)}

				{canPaste && (
					<>
						{entry && <ContextMenuSeparator />}
						<ContextMenuItem onClick={onPaste}>
							<Copy className="mr-2 h-4 w-4" />
							<span>Paste</span>
						</ContextMenuItem>
					</>
				)}

				<ContextMenuSeparator />
				<ContextMenuItem onClick={onRefresh}>
					<RefreshCw className="mr-2 h-4 w-4" />
					<span>Refresh</span>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
