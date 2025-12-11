"use client";

import { AlertCircle, FileX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BinaryFileViewerProps {
    filePath: string;
}

export function BinaryFileViewer({ filePath }: BinaryFileViewerProps) {
    const fileName = filePath.split(/[\\/]/).pop() || "Unknown";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

    return (
        <div className="h-full w-full flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full space-y-4">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                        <FileX className="h-10 w-10 text-muted-foreground" />
                    </div>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Cannot View Binary File</AlertTitle>
                    <AlertDescription>
                        <div className="space-y-2 mt-2">
                            <p className="text-sm">
                                <span className="font-medium">{fileName}</span> is a binary file and
                                cannot be displayed in the text editor.
                            </p>
                            {fileExtension && (
                                <p className="text-xs text-muted-foreground">
                                    File type: <span className="font-mono">.{fileExtension}</span>
                                </p>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>

                <div className="text-center text-xs text-muted-foreground space-y-1">
                    <p>Binary files that cannot be viewed include:</p>
                    <p className="font-mono">
                        .db, .sqlite, .exe, .dll, .so, .bin, .pdf, .zip, .png, .jpg, etc.
                    </p>
                </div>
            </div>
        </div>
    );
}
