import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { safeInvoke } from "@/lib/tauri";

const SERVER_URL = "http://localhost:8001";
const HEALTH_CHECK_INTERVAL = 500; // Check every 500ms
const MAX_HEALTH_CHECK_ATTEMPTS = 60; // 30 seconds total (60 * 500ms)

// Global ref to track if server is processing a request
// This prevents false negatives during active AI requests
export const serverProcessingState = { isProcessing: false };

export function usePythonServer() {
	const [isRunning, setIsRunning] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const toastIdRef = useRef<string | number | null>(null);

	// Health check function - pings the actual HTTP server
	const checkServerHealth = useCallback(async (): Promise<boolean> => {
		try {
			const response = await fetch(`${SERVER_URL}/health`, {
				method: "GET",
				signal: AbortSignal.timeout(5000), // 5 second timeout (increased for busy server)
			});
			return response.ok;
		} catch (error) {
			return false;
		}
	}, []);

	// Check server status on mount and periodically
	const checkServerStatus = useCallback(async () => {
		// Don't update server status if currently processing a request
		if (serverProcessingState.isProcessing) {
			return;
		}

		try {
			const running = await safeInvoke<boolean>("is_server_running");
			const healthy = running ? await checkServerHealth() : false;
			setIsRunning(healthy);
		} catch (error) {
			console.error("Failed to check server status:", error);
			setIsRunning(false);
		}
	}, [checkServerHealth]);

	useEffect(() => {
		checkServerStatus();
		// Check server status every 5 seconds
		const interval = setInterval(checkServerStatus, 5000);
		return () => clearInterval(interval);
	}, [checkServerStatus]);

	// Wait for server to be healthy
	const waitForServerHealth = useCallback(async (): Promise<boolean> => {
		let attempts = 0;

		return new Promise((resolve) => {
			healthCheckIntervalRef.current = setInterval(async () => {
				attempts++;

				const isHealthy = await checkServerHealth();

				if (isHealthy) {
					if (healthCheckIntervalRef.current) {
						clearInterval(healthCheckIntervalRef.current);
						healthCheckIntervalRef.current = null;
					}
					resolve(true);
				} else if (attempts >= MAX_HEALTH_CHECK_ATTEMPTS) {
					if (healthCheckIntervalRef.current) {
						clearInterval(healthCheckIntervalRef.current);
						healthCheckIntervalRef.current = null;
					}
					resolve(false);
				}
			}, HEALTH_CHECK_INTERVAL);
		});
	}, [checkServerHealth]);

	const startServer = useCallback(async () => {
		if (isLoading) return;

		setIsLoading(true);

		// Show loading toast
		toastIdRef.current = toast.loading("Starting Python server...", {
			description: "Please wait while the server initializes",
		});

		try {
			const result = await safeInvoke<string>("start_python_server");

			if (!result) {
				throw new Error("Failed to start server process");
			}

			// Update toast to show we're waiting for server to be ready
			toast.loading("Waiting for server to be ready...", {
				id: toastIdRef.current,
				description: "Initializing AI components",
			});

			// Wait for server to actually be healthy
			const isHealthy = await waitForServerHealth();

			if (isHealthy) {
				setIsRunning(true);
				toast.success("Python server started", {
					id: toastIdRef.current,
					description: "Server is ready on port 8001",
				});
			} else {
				throw new Error("Server started but failed health check");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			toast.error("Failed to start server", {
				id: toastIdRef.current,
				description: errorMessage,
			});
			console.error("Failed to start server:", error);
			setIsRunning(false);
		} finally {
			setIsLoading(false);
			toastIdRef.current = null;
			// Recheck status after completion
			setTimeout(checkServerStatus, 1000);
		}
	}, [isLoading, checkServerStatus, waitForServerHealth]);

	const stopServer = useCallback(async () => {
		if (isLoading) return;

		// Clear any pending health checks
		if (healthCheckIntervalRef.current) {
			clearInterval(healthCheckIntervalRef.current);
			healthCheckIntervalRef.current = null;
		}

		setIsLoading(true);

		const loadingToastId = toast.loading("Stopping Python server...");

		try {
			const result = await safeInvoke<string>("stop_python_server");
			if (result) {
				setIsRunning(false);
				toast.success("Python server stopped", {
					id: loadingToastId,
					description: "Server has been shut down",
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			toast.error("Failed to stop server", {
				id: loadingToastId,
				description: errorMessage,
			});
			console.error("Failed to stop server:", error);
		} finally {
			setIsLoading(false);
			// Recheck status after a short delay
			setTimeout(checkServerStatus, 1000);
		}
	}, [isLoading, checkServerStatus]);

	const toggleServer = useCallback(async () => {
		if (isRunning) {
			await stopServer();
		} else {
			await startServer();
		}
	}, [isRunning, startServer, stopServer]);

	// Mark server as processing request (prevents status checks during active requests)
	const markProcessingStart = useCallback(() => {
		serverProcessingState.isProcessing = true;
	}, []);

	const markProcessingEnd = useCallback(() => {
		serverProcessingState.isProcessing = false;
		// Recheck server status after request completes
		setTimeout(checkServerStatus, 500);
	}, [checkServerStatus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (healthCheckIntervalRef.current) {
				clearInterval(healthCheckIntervalRef.current);
			}
		};
	}, []);

	return {
		isRunning,
		isLoading,
		startServer,
		stopServer,
		toggleServer,
		markProcessingStart,
		markProcessingEnd,
	};
}
