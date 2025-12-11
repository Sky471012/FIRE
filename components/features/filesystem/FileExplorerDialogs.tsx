"use client";

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
import type { FileSystemEntry } from "@/types/filesystem";

interface FileExplorerDialogsProps {
    showNewFileDialog: boolean;
    showNewFolderDialog: boolean;
    showRenameDialog: boolean;
    showDeleteDialog: boolean;
    dialogInput: string;
    contextEntry: FileSystemEntry | null;
    setShowNewFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setShowNewFolderDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setDialogInput: React.Dispatch<React.SetStateAction<string>>;
    confirmNewFile: () => Promise<void>;
    confirmNewFolder: () => Promise<void>;
    confirmRename: () => Promise<void>;
    confirmDelete: () => Promise<void>;
}

export function FileExplorerDialogs({
    showNewFileDialog,
    showNewFolderDialog,
    showRenameDialog,
    showDeleteDialog,
    dialogInput,
    contextEntry,
    setShowNewFileDialog,
    setShowNewFolderDialog,
    setShowRenameDialog,
    setShowDeleteDialog,
    setDialogInput,
    confirmNewFile,
    confirmNewFolder,
    confirmRename,
    confirmDelete,
}: FileExplorerDialogsProps) {
    return (
        <>
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
                        <AlertDialogAction onClick={confirmNewFile}>Create</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* New Folder Dialog */}
            <AlertDialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
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
                        <AlertDialogAction onClick={confirmNewFolder}>Create</AlertDialogAction>
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
                        <AlertDialogAction onClick={confirmRename}>Rename</AlertDialogAction>
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
