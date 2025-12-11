import { toast } from "sonner";
import { useFileSystem } from "@/hooks/use-filesystem";
import { fileSystemApi } from "@/lib/filesystem-api";
import type { FileSystemEntry } from "@/types/filesystem";

export function useFileExplorerDialogs(
    targetPath: string,
    dialogInput: string,
    contextEntry: FileSystemEntry | null,
    setShowNewFileDialog: React.Dispatch<React.SetStateAction<boolean>>,
    setShowNewFolderDialog: React.Dispatch<React.SetStateAction<boolean>>,
    setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>,
    setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>,
    setDialogInput: React.Dispatch<React.SetStateAction<string>>,
) {
    const { triggerRefresh, expandFolder } = useFileSystem();

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

    return {
        confirmNewFile,
        confirmNewFolder,
        confirmRename,
        confirmDelete,
    };
}
