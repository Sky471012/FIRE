"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { fileSystemApi } from "@/lib/filesystem-api";
import { BinaryFileViewer } from "./BinaryFileViewer";
import { MonacoEditor } from "./MonacoEditor";

interface FileTabContentProps {
	filePath: string;
	tabId: string;
}

export function FileTabContent({ filePath, tabId }: FileTabContentProps) {
	const [isBinary, setIsBinary] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkIfBinary = async () => {
			try {
				setLoading(true);
				const binary = await fileSystemApi.isFileBinary(filePath);
				setIsBinary(binary);
			} catch (err) {
				console.error("Failed to check if file is binary:", err);
				setIsBinary(true); // Assume binary if check fails
			} finally {
				setLoading(false);
			}
		};

		checkIfBinary();
	}, [filePath]);

	if (loading) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-background">
				<Spinner className="h-8 w-8" />
			</div>
		);
	}

	if (isBinary) {
		return <BinaryFileViewer filePath={filePath} />;
	}

	return <MonacoEditor filePath={filePath} tabId={tabId} />;
}

