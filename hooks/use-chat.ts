import { create } from "zustand";

const API_BASE_URL = "http://localhost:8001";

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	created_at?: string;
}

export interface ChatSession {
	id: string;
	created_at: string;
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

	// Simple setters
	setCurrentProjectPath: (path) => set({ currentProjectPath: path }),
	setSessions: (sessions) => set({ sessions }),
	setCurrentSessionId: (id) => set({ currentSessionId: id }),
	setMessages: (messages) => set({ messages }),
	setIsLoading: (loading) => set({ isLoading: loading }),
	setIsSending: (sending) => set({ isSending: sending }),
	setError: (error) => set({ error }),
	setVisualizationSpec: (spec) => set({ visualizationSpec: spec }),
	clearError: () => set({ error: null }),

	// Load sessions
	loadSessions: async () => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) return;

		try {
			set({ isLoading: true, error: null });

			const response = await fetch(
				`${API_BASE_URL}/sessions?data_path=${encodeURIComponent(dataPath)}`,
			);

			if (!response.ok) {
				throw new Error(`Failed to load sessions: ${response.statusText}`);
			}

			const data = await response.json();
			set({ sessions: data.sessions || [] });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load sessions";
			set({ error: errorMessage });
			console.error("Error loading sessions:", err);
		} finally {
			set({ isLoading: false });
		}
	},

	// Load session history
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

			const response = await fetch(
				`${API_BASE_URL}/sessions/${sessionId}/history?data_path=${encodeURIComponent(dataPath)}`,
			);

			console.log("[useChat] Response status:", response.status);

			if (!response.ok) {
				throw new Error(
					`Failed to load session history: ${response.statusText}`,
				);
			}

			const data = await response.json();
			console.log("[useChat] Loaded history:", data);
			set({ 
				messages: data.history || [], 
				currentSessionId: sessionId 
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

	// Create new session
	createSession: async () => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) {
			set({ error: "No project loaded" });
			return null;
		}

		try {
			set({ isLoading: true, error: null });

			const response = await fetch(`${API_BASE_URL}/sessions/new`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ data_path: dataPath }),
			});

			if (!response.ok) {
				throw new Error(`Failed to create session: ${response.statusText}`);
			}

			const data = await response.json();
			await get().loadSessions();
			set({ 
				currentSessionId: data.session_id,
				messages: [],
				visualizationSpec: null
			});
			return data.session_id;
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

	// Delete session
	deleteSession: async (sessionId: string) => {
		const dataPath = getDataPath(get().currentProjectPath);
		if (!dataPath) return;

		try {
			set({ isLoading: true, error: null });

			const response = await fetch(
				`${API_BASE_URL}/sessions/${sessionId}?data_path=${encodeURIComponent(dataPath)}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to delete session: ${response.statusText}`);
			}

			await get().loadSessions();

			// Clear current session if it was deleted
			if (get().currentSessionId === sessionId) {
				set({ 
					currentSessionId: null,
					messages: [],
					visualizationSpec: null
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
		set({ messages: [...currentMessages, userMessage], isSending: true, error: null });

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
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to send message";
			set({ error: errorMessage });
			console.error("Error sending message:", err);
			// On error, remove the optimistically added user message
			set({ messages: currentMessages });
		} finally {
			set({ isSending: false });
		}
	},
}));
