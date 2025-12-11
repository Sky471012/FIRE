"use client";

import { invoke } from "@tauri-apps/api/core";
import type { FileSystemEntry } from "@/types/filesystem";

export const fileSystemApi = {
    /**
     * Read directory contents
     */
    async readDirectory(path: string): Promise<FileSystemEntry[]> {
        return await invoke<FileSystemEntry[]>("read_directory", { path });
    },

    /**
     * Read directory recursively with max depth
     */
    async readDirectoryRecursive(path: string, maxDepth?: number): Promise<FileSystemEntry> {
        return await invoke<FileSystemEntry>("read_directory_recursive", {
            path,
            maxDepth,
        });
    },

    /**
     * Get file/folder information
     */
    async getFileInfo(path: string): Promise<FileSystemEntry> {
        return await invoke<FileSystemEntry>("get_file_info", { path });
    },

    /**
     * Create a new file
     */
    async createFile(path: string, name: string): Promise<string> {
        return await invoke<string>("create_file", { path, name });
    },

    /**
     * Create a new folder
     */
    async createFolder(path: string, name: string): Promise<string> {
        return await invoke<string>("create_folder", { path, name });
    },

    /**
     * Delete a file
     */
    async deleteFile(path: string): Promise<void> {
        return await invoke<void>("delete_file", { path });
    },

    /**
     * Delete a folder
     */
    async deleteFolder(path: string): Promise<void> {
        return await invoke<void>("delete_folder", { path });
    },

    /**
     * Rename a file or folder
     */
    async renameEntry(oldPath: string, newName: string): Promise<string> {
        return await invoke<string>("rename_entry", { oldPath, newName });
    },

    /**
     * Copy a file or folder
     */
    async copyEntry(sourcePath: string, destPath: string): Promise<string> {
        return await invoke<string>("copy_entry", { sourcePath, destPath });
    },

    /**
     * Move a file or folder
     */
    async moveEntry(sourcePath: string, destPath: string): Promise<string> {
        return await invoke<string>("move_entry", { sourcePath, destPath });
    },

    /**
     * Read file content
     */
    async readFileContent(path: string): Promise<string> {
        return await invoke<string>("read_file_content", { path });
    },

    /**
     * Write file content
     */
    async writeFileContent(path: string, content: string): Promise<void> {
        return await invoke<void>("write_file_content", { path, content });
    },

    /**
     * Check if file is binary
     */
    async isFileBinary(path: string): Promise<boolean> {
        return await invoke<boolean>("is_file_binary", { path });
    },
};
