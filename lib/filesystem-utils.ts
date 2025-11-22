/**
 * Format bytes to human-readable file size
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
}

/**
 * Format Unix timestamp to readable date
 */
export function formatDate(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	// Less than 1 day
	if (diff < 86400000) {
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Less than 1 week
	if (diff < 604800000) {
		return date.toLocaleDateString([], {
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Default
	return date.toLocaleDateString([], {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
	return fileName.split(".").pop()?.toLowerCase() || "";
}

/**
 * Check if path is hidden (starts with .)
 */
export function isHiddenFile(fileName: string): boolean {
	return fileName.startsWith(".");
}
