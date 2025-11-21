const isTauri = typeof window !== "undefined" && window.isTauri;

async function safeInvoke<T>(
	command: string,
	args?: Record<string, unknown>,
): Promise<T | undefined> {
	try {
		const { invoke } = await import("@tauri-apps/api/core");
		if (isTauri) {
			return await invoke<T>(command, args);
		}
		console.error(`Tauri environment not detected. Cannot invoke ${command}.`);
		return undefined;
	} catch (error) {
		console.error(`Failed to invoke ${command}:`, error);
		return undefined;
	}
}
export { safeInvoke };
