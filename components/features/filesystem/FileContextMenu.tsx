"use client";

import {
	Copy,
	Edit,
	FilePlus,
	FileText,
	FolderPlus,
	RefreshCw,
	Scissors,
	Trash2,
} from "lucide-react";
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
	console.log(
		"[FileContextMenu] Rendering with entry:",
		entry,
		"canPaste:",
		canPaste,
	);

	return (
		<ContextMenu>
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
