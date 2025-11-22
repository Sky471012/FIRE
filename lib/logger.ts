import { safeInvoke } from "@/lib/tauri.ts";

type level = "info" | "warn" | "error" | "debug";
const isTauri = typeof window !== "undefined" && window.isTauri;

/**
 * Logger utility for logging messages to ~/.fire/temp/session_datetime.log
 */
class Logger {
	/**
	 * Log an informational message
	 */
	async info(message: string): Promise<void> {
		try {
			await safeInvoke("log_info", { message });
		} catch (error) {
			console.error("Failed to log info:", error);
		}
	}

	/**
	 * Log a warning message
	 */
	async warn(message: string): Promise<void> {
		try {
			await safeInvoke("log_warn", { message });
		} catch (error) {
			console.error("Failed to log warning:", error);
		}
	}

	/**
	 * Log an error message
	 */
	async error(message: string): Promise<void> {
		try {
			await safeInvoke("log_error", { message });
		} catch (error) {
			console.error("Failed to log error:", error);
		}
	}

	/**
	 * Log a debug message
	 */
	async debug(message: string): Promise<void> {
		try {
			await safeInvoke("log_debug", { message });
		} catch (error) {
			console.error("Failed to log debug:", error);
		}
	}

	/**
	 * Get the current log file path
	 */
	async getLogPath(): Promise<string | undefined> {
		try {
			return await safeInvoke<string>("get_log_path");
		} catch (error) {
			console.error("Failed to get log path:", error);
			return undefined;
		}
	}

	/**
	 * Log with a custom level
	 */
	async log(level: level, message: string): Promise<void> {
		switch (level) {
			case "info":
				return this.info(message);
			case "warn":
				return this.warn(message);
			case "error":
				return this.error(message);
			case "debug":
				return this.debug(message);
		}
	}

	/**
	 * Check if logger is available (Tauri environment)
	 */
	isTauriAvailable(): boolean {
		return isTauri;
	}
}

// Export singleton instance
export const logger = new Logger();
