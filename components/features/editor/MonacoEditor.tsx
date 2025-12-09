"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useTabs } from "@/hooks/use-tabs";
import { fileSystemApi } from "@/lib/filesystem-api";
import { MarkdownPreview } from "./MarkdownPreview";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

interface MonacoEditorProps {
	filePath: string;
	tabId: string;
}

export function MonacoEditor({ filePath, tabId }: MonacoEditorProps) {
	const { theme } = useTheme();
	const { updateTab } = useTabs();
	const [content, setContent] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const editorRef = useRef<any>(null);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Load file content
	useEffect(() => {
		const loadFile = async () => {
			try {
				setLoading(true);
				setError(null);
				const fileContent = await fileSystemApi.readFileContent(filePath);
				setContent(fileContent);
			} catch (err) {
				const errorMessage = String(err);
				setError(errorMessage);
				toast.error(`Failed to load file: ${errorMessage}`);
			} finally {
				setLoading(false);
			}
		};

		loadFile();
	}, [filePath]);

	// Save file with debounce
	const saveFile = useCallback(
		async (value: string) => {
			try {
				await fileSystemApi.writeFileContent(filePath, value);
				updateTab(tabId, { isDirty: false });
			} catch (err) {
				toast.error(`Failed to save file: ${err}`);
			}
		},
		[filePath, tabId, updateTab],
	);

	// Handle editor changes
	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			if (value === undefined) return;

			// Update content immediately for preview
			setContent(value);

			// Mark as dirty
			updateTab(tabId, { isDirty: true });

			// Clear existing timeout
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// Set new timeout for auto-save (500ms debounce)
			saveTimeoutRef.current = setTimeout(() => {
				saveFile(value);
			}, 500);
		},
		[tabId, updateTab, saveFile],
	);

	// Handle editor mount
	const handleEditorDidMount: OnMount = useCallback((editor, _monaco) => {
		editorRef.current = editor;

		// Configure editor options
		editor.updateOptions({
			fontSize: 14,
			lineHeight: 22,
			fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
			minimap: { enabled: true },
			scrollBeyondLastLine: false,
			automaticLayout: true,
			tabSize: 2,
			insertSpaces: false,
		});
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	// Handle Ctrl+S keyboard shortcut
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				if (editorRef.current) {
					const value = editorRef.current.getValue();
					saveFile(value);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [saveFile]);

	// Check if file should show preview
	const shouldShowPreview = (path: string): boolean => {
		const ext = path.split(".").pop()?.toLowerCase();
		return ext === "md" || ext === "markdown" || ext === "tex" || ext === "latex";
	};

	const isLatexFile = (path: string): boolean => {
		const ext = path.split(".").pop()?.toLowerCase();
		return ext === "tex" || ext === "latex";
	};

	const showPreview = shouldShowPreview(filePath);
	const isLatex = isLatexFile(filePath);

	// Get file extension for language detection
	const getLanguage = (path: string): string => {
		const ext = path.split(".").pop()?.toLowerCase();
		const languageMap: Record<string, string> = {
			js: "javascript",
			jsx: "javascript",
			ts: "typescript",
			tsx: "typescript",
			py: "python",
			rs: "rust",
			go: "go",
			java: "java",
			cpp: "cpp",
			c: "c",
			h: "c",
			hpp: "cpp",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			swift: "swift",
			kt: "kotlin",
			scala: "scala",
			sql: "sql",
			sh: "shell",
			bash: "shell",
			zsh: "shell",
			json: "json",
			xml: "xml",
			yaml: "yaml",
			yml: "yaml",
			toml: "toml",
			ini: "ini",
			md: "markdown",
			markdown: "markdown",
			tex: "latex",
			latex: "latex",
			html: "html",
			css: "css",
			scss: "scss",
			sass: "sass",
			less: "less",
			vue: "vue",
			svelte: "svelte",
		};
		return languageMap[ext || ""] || "plaintext";
	};

	if (loading) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-background">
				<Spinner className="h-8 w-8" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-background">
				<div className="text-center space-y-2">
					<p className="text-sm font-medium text-destructive">
						Failed to load file
					</p>
					<p className="text-xs text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	if (!showPreview) {
		return (
			<div className="h-full w-full">
				<Editor
					height="100%"
					language={getLanguage(filePath)}
					value={content}
					onChange={handleEditorChange}
					onMount={handleEditorDidMount}
					theme={theme === "dark" ? "vs-dark" : "light"}
					options={{
						automaticLayout: true,
						wordWrap: "on",
					}}
				/>
			</div>
		);
	}

	return (
		<ResizablePanelGroup direction="horizontal" className="h-full w-full">
			<ResizablePanel defaultSize={50} minSize={30}>
				<div className="h-full w-full">
					<Editor
						height="100%"
						language={getLanguage(filePath)}
						value={content}
						onChange={handleEditorChange}
						onMount={handleEditorDidMount}
						theme={theme === "dark" ? "vs-dark" : "light"}
						options={{
							automaticLayout: true,
							wordWrap: "on",
						}}
					/>
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={50} minSize={30}>
				<MarkdownPreview content={content} isLatex={isLatex} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
