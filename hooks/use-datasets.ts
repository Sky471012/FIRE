import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState, useCallback } from "react";

export interface TableInfo {
	name: string;
	row_count: number;
	column_count: number;
}

export function useDatasets() {
	const [tables, setTables] = useState<TableInfo[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadTables = useCallback(async (projectPath: string) => {
		setIsLoading(true);
		setError(null);
		try {
			// Get the project_data.db path
			const dbPath = `${projectPath}/data/project_data.db`;

			// Get all tables from the database
			const tableList = await invoke<TableInfo[]>("get_tables", {
				dbPath,
			});

			setTables(tableList);
		} catch (err) {
			console.error("Failed to load tables:", err);
			setError(err instanceof Error ? err.message : String(err));
			setTables([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const importDataset = useCallback(async (projectPath: string) => {
		setIsImporting(true);
		try {
			// Open file dialog with filters for supported file types
			const selectedFile = await open({
				title: "Select Dataset to Import",
				multiple: false,
				filters: [
					{
						name: "Supported Formats",
						extensions: ["csv", "xlsx", "xls", "nc", "parquet"],
					},
					{
						name: "CSV Files",
						extensions: ["csv"],
					},
					{
						name: "Excel Files",
						extensions: ["xlsx", "xls"],
					},
					{
						name: "NetCDF Files",
						extensions: ["nc"],
					},
					{
						name: "Parquet Files",
						extensions: ["parquet"],
					},
				],
			});

			if (!selectedFile) {
				// User cancelled
				return;
			}

			// Determine file type and call appropriate import function
			const filePath = selectedFile as string;
			const extension = filePath.split(".").pop()?.toLowerCase();

			console.log("Importing file:", filePath, "with extension:", extension);

			switch (extension) {
				case "csv":
					await invoke("from_csv", {
						filePath,
						projectPath,
					});
					break;
				case "xlsx":
				case "xls":
					await invoke("from_excel", {
						filePath,
						projectPath,
					});
					break;
				case "nc":
					await invoke("from_netcdf", {
						filePath,
						projectPath,
					});
					break;
				case "parquet":
					await invoke("from_parquet", {
						filePath,
						projectPath,
					});
					break;
				default:
					throw new Error(`Unsupported file format: ${extension}`);
			}

			// Reload tables after successful import
			await loadTables(projectPath);

			console.log("Dataset imported successfully");
		} catch (err) {
			console.error("Failed to import dataset:", err);
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsImporting(false);
		}
	}, [loadTables]);

	const ingestFromUrl = useCallback(
		async (
			projectPath: string,
			url: string,
			mode: "static" | "dynamic",
			maxDepth: number,
		) => {
			setIsImporting(true);
			setError(null);
			try {
				// Get the data path for the project
				const dataPath = `${projectPath}/data`;

				// Call the Python FastAPI /docs/ingest endpoint
				const response = await fetch(
					"http://localhost:8001/docs/ingest?" +
						new URLSearchParams({
							url,
							data_path: dataPath,
							mode,
							max_depth: maxDepth.toString(),
							max_workers: "10",
							auto_embed: "true",
							model_name: "sentence-transformers/all-MiniLM-L6-v2",
						}),
					{
						method: "POST",
					},
				);

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(
						errorData.detail || `HTTP error! status: ${response.status}`,
					);
				}

				const result = await response.json();
				console.log("URL ingestion result:", result);

				// Reload tables after successful ingestion
				await loadTables(projectPath);

				return result;
			} catch (err) {
				console.error("Failed to ingest from URL:", err);
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				throw err;
			} finally {
				setIsImporting(false);
			}
		},
		[loadTables],
	);

	return {
		tables,
		isLoading,
		isImporting,
		error,
		loadTables,
		importDataset,
		ingestFromUrl,
	};
}
