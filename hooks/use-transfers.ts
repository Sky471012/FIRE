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
				return;
			}

			setIsLoading(true);
			const result = await invoke<Transfer[]>("check_incoming_transfers");
			setTransfers(result);
			setError(null);
		} catch (err) {
			setError(err as string);
			console.error("Failed to check transfers:", err);
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
