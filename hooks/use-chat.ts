import { create } from "zustand";
import { safeInvoke } from "@/lib/tauri";
import { serverProcessingState } from "./use-python-server";

const API_BASE_URL = "http://localhost:8001";

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	created_at?: string;
}

export interface ChatSession {
	id: string;
	created_at: string;
	title?: string;
}

export interface VisualizationSpec {
	sql: string;
	plot_type: string;
	x: string;
	y: string[];
	z?: string;
	title?: string;
	x_label?: string;
	y_label?: string;
	z_label?: string;
	color_by?: string;
	facet_by?: string;
	lon?: string;
	lat?: string;
	value?: string;
}

interface ChatState {
	// State
	sessions: ChatSession[];
	currentSessionId: string | null;
	messages: ChatMessage[];
	isLoading: boolean;
	isSending: boolean;
	error: string | null;
	visualizationSpec: VisualizationSpec | null;
	currentProjectPath: string | null;
	serverRequired: boolean;

	// Actions
	setCurrentProjectPath: (path: string | null) => void;
	setSessions: (sessions: ChatSession[]) => void;
	setCurrentSessionId: (id: string | null) => void;
	setMessages: (messages: ChatMessage[]) => void;
	setIsLoading: (loading: boolean) => void;
	setIsSending: (sending: boolean) => void;
	setError: (error: string | null) => void;
	setVisualizationSpec: (spec: VisualizationSpec | null) => void;
	clearError: () => void;

	// Async actions
	loadSessions: () => Promise<void>;
	loadSessionHistory: (sessionId: string) => Promise<void>;
	createSession: () => Promise<string | null>;
	deleteSession: (sessionId: string) => Promise<void>;
	sendMessage: (message: string) => Promise<void>;
}

const getDataPath = (projectPath: string | null): string | null => {
	if (!projectPath) return null;
	return `${projectPath}/data`;
};

export const useChat = create<ChatState>((set, get) => ({
	// Initial state
	sessions: [],
	currentSessionId: null,
	messages: [],
	isLoading: false,
	isSending: false,
	error: null,
	visualizationSpec: null,
	currentProjectPath: null,
	serverRequired: false,

	// Simple setters
	setCurrentProjectPath: (path) => {
		// Clear chat state when project changes
		const currentPath = get().currentProjectPath;
		if (currentPath !== path) {
			set({ 
				currentProjectPath: path,
				sessions: [],
				currentSessionId: null,
				messages: [],
				visualizationSpec: null,
				error: null,
			});
		}
	},
	setSessions: (sessions) => set({ sessions }),
	setCurrentSessionId: (id) => set({ currentSessionId: id }),
	setMessages: (messages) => set({ messages }),
	setIsLoading: (loading) => set({ isLoading: loading }),
	setIsSending: (sending) => set({ isSending: sending }),
	setError: (error) => set({ error }),
	setVisualizationSpec: (spec) => set({ visualizationSpec: spec }),
	clearError: () => set({ error: null }),

	// Load sessions from local DuckDB database
	loadSessions: async () => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) return;

		try {
			set({ isLoading: true, error: null });

			const sessions = await safeInvoke<ChatSession[]>("get_chat_sessions", {
				dataPath: dataPath,
			});

			set({ sessions: sessions || [] });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load sessions";
			set({ error: errorMessage });
			console.error("Error loading sessions:", err);
		} finally {
			set({ isLoading: false });
		}
	},

	// Load session history from local DuckDB database
	loadSessionHistory: async (sessionId: string) => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) {
			console.log("[useChat] No data path available");
			return;
		}

		console.log("[useChat] Loading session history:", sessionId);
		console.log("[useChat] Data path:", dataPath);

		try {
			set({ isLoading: true, error: null });

			const messages = await safeInvoke<ChatMessage[]>("get_chat_history", {
				sessionId: sessionId,
				dataPath: dataPath,
			});

			console.log("[useChat] Loaded history:", messages);
			set({
				messages: messages || [],
				currentSessionId: sessionId,
				serverRequired: true, // Mark that server is required for sending new messages
			});
			console.log("[useChat] Set current session to:", sessionId);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load session history";
			set({ error: errorMessage });
			console.error("Error loading session history:", err);
		} finally {
			set({ isLoading: false });
		}
	},

	// Create new session in local DuckDB database
	createSession: async () => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) {
			set({ error: "No project loaded" });
			return null;
		}

		try {
			set({ isLoading: true, error: null });

			const sessionId = await safeInvoke<string>("create_chat_session", {
				dataPath: dataPath,
			});

			if (!sessionId) {
				throw new Error("Failed to create session");
			}

			await get().loadSessions();
			set({
				currentSessionId: sessionId,
				messages: [],
				visualizationSpec: null,
				serverRequired: true, // Mark that server is required for sending messages
			});
			return sessionId;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to create session";
			set({ error: errorMessage });
			console.error("Error creating session:", err);
			return null;
		} finally {
			set({ isLoading: false });
		}
	},

	// Delete session from local DuckDB database
	deleteSession: async (sessionId: string) => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) return;

		try {
			set({ isLoading: true, error: null });

			await safeInvoke("delete_chat_session", {
				sessionId: sessionId,
				dataPath: dataPath,
			});

			await get().loadSessions();

			// Clear current session if it was deleted
			if (get().currentSessionId === sessionId) {
				set({
					currentSessionId: null,
					messages: [],
					visualizationSpec: null,
					serverRequired: false,
				});
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete session";
			set({ error: errorMessage });
			console.error("Error deleting session:", err);
		} finally {
			set({ isLoading: false });
		}
	},

	// Send message
	sendMessage: async (message: string) => {
		const dataPath = getDataPath(get().currentProjectPath);
		const currentSessionId = get().currentSessionId;

		if (!dataPath || !currentSessionId) {
			set({ error: "No session selected" });
			return;
		}

		// Immediately add the user's message to the UI
		const userMessage: ChatMessage = {
			role: "user",
			content: message,
			created_at: new Date().toISOString(),
		};
		const currentMessages = get().messages;
		set({
			messages: [...currentMessages, userMessage],
			isSending: true,
			error: null,
		});

		// Mark server as processing to prevent false negative status checks
		serverProcessingState.isProcessing = true;

		try {
			const response = await fetch(`${API_BASE_URL}/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					session_id: currentSessionId,
					message: message,
					data_path: dataPath,
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to send message: ${response.statusText}`);
			}

			const data = await response.json();
			// Replace with the full history from server (includes timestamps from DB)
			set({ messages: data.history || [] });

			// Update visualization spec if present
			if (data.visualization_spec) {
				set({ visualizationSpec: data.visualization_spec });
			}

			// Reload sessions to update the title (if this was the first message)
			await get().loadSessions();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to send message";
			set({ error: errorMessage });
			console.error("Error sending message:", err);
			// On error, remove the optimistically added user message
			set({ messages: currentMessages });
		} finally {
			// Mark processing as complete
			serverProcessingState.isProcessing = false;
			set({ isSending: false });
		}
	},
}));
