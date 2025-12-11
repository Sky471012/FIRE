/**
 * TypeScript types for file system operations
 */

export interface FileSystemEntry {
    name: string;
    path: string;
    is_directory: boolean;
    size?: number;
    modified?: number;
    children?: FileSystemEntry[];
}

export interface FileSystemTreeNode extends FileSystemEntry {
    expanded?: boolean;
    level: number;
}

export type FileSystemAction =
    | "newFile"
    | "newFolder"
    | "rename"
    | "delete"
    | "copy"
    | "cut"
    | "paste"
    | "refresh";

export interface ClipboardData {
    entry: FileSystemEntry;
    operation: "copy" | "cut";
}
