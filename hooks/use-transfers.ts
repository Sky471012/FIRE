import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface Transfer {
	recipient_username: string;
	timestamp: string;
	sender: string;
	code: string;
}

export function useTransfers() {
	const [transfers, setTransfers] = useState<Transfer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const checkTransfers = async () => {
		try {
			// First check if user is logged in
			const user = await invoke<string | null>("get_current_user");
			setIsLoggedIn(user !== null);

			if (!user) {
				setTransfers([]);
				setError(null); // Clear any previous errors
				return;
			}

			setIsLoading(true);
			const result = await invoke<Transfer[]>("check_incoming_transfers");
			setTransfers(result);
			setError(null);
		} catch (err) {
			const errorMessage = err as string;
			
			// Silently handle expected errors in development
			const isExpectedError = 
				errorMessage.includes("Not logged in") || 
				errorMessage.includes("service error") ||
				errorMessage.includes("Failed to query transfers");
			
			if (isExpectedError) {
				// Clear error state for expected errors (like not being logged in)
				if (errorMessage.includes("Not logged in")) {
					setError(null);
					setTransfers([]);
				} else {
					// For service errors, only set error if not in development
					if (process.env.NODE_ENV !== "development") {
						setError(errorMessage);
						console.error("Failed to check transfers:", err);
					}
				}
			} else {
				// Unexpected errors should always be logged
				setError(errorMessage);
				console.error("Failed to check transfers:", err);
			}
		} finally {
			setIsLoading(false);
		}
	};

	// Poll for transfers every 30 seconds
	useEffect(() => {
		checkTransfers(); // Initial check

		const interval = setInterval(() => {
			checkTransfers();
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
	}, []);

	return {
		transfers,
		isLoading,
		error,
		isLoggedIn,
		refresh: checkTransfers,
	};
}
