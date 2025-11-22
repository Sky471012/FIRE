"use client";

import { Database, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatasets } from "@/hooks/use-datasets";
import { useProject } from "@/hooks/use-project";
import type { TableInfo } from "@/hooks/use-datasets";
import { cn } from "@/lib/utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DatasetsList() {
	const { currentProjectPath } = useProject();
	const {
		tables,
		isLoading,
		error,
		loadTables,
		importDataset,
		isImporting,
	} = useDatasets();

	// Load tables when project path changes
	useEffect(() => {
		if (currentProjectPath) {
			loadTables(currentProjectPath);
		}
	}, [currentProjectPath, loadTables]);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [tableToDelete, setTableToDelete] = useState<string | null>(null);

	const handleImportClick = async () => {
		if (!currentProjectPath) {
			console.error("No project path available");
			return;
		}
		await importDataset(currentProjectPath);
	};

	const handleRefresh = () => {
		if (currentProjectPath) {
			loadTables(currentProjectPath);
		}
	};

	const confirmDelete = (tableName: string) => {
		setTableToDelete(tableName);
		setDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (tableToDelete && currentProjectPath) {
			// TODO: Implement delete functionality
			console.log("Delete table:", tableToDelete);
			setDeleteDialogOpen(false);
			setTableToDelete(null);
		}
	};

	if (!currentProjectPath) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-4 text-center">
				<Database className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
				<p className="text-sm text-muted-foreground">
					No project opened. Please open or create a project first.
				</p>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="px-4 py-2 border-b border-border flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Datasets
				</h2>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={handleRefresh}
						disabled={isLoading}
						title="Refresh datasets"
					>
						<RefreshCw
							className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
						/>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={handleImportClick}
						disabled={isImporting || isLoading}
						title="Import dataset"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Content */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-1">
					{isLoading ? (
						// Loading skeleton
						<>
							{[1, 2, 3].map((i) => (
								<div key={i} className="p-2 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							))}
						</>
					) : error ? (
						// Error state
						<div className="p-4 text-center">
							<p className="text-sm text-destructive mb-2">
								Failed to load datasets
							</p>
							<p className="text-xs text-muted-foreground mb-3">{error}</p>
							<Button variant="outline" size="sm" onClick={handleRefresh}>
								Try Again
							</Button>
						</div>
					) : tables.length === 0 ? (
						// Empty state
						<div className="flex flex-col items-center justify-center p-8 text-center">
							<Database className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
							<p className="text-sm text-muted-foreground mb-2">
								No datasets yet
							</p>
							<p className="text-xs text-muted-foreground mb-4">
								Click the + button to import a dataset
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={handleImportClick}
								disabled={isImporting}
							>
								<Plus className="h-3.5 w-3.5 mr-1.5" />
								Import Dataset
							</Button>
						</div>
					) : (
						// Table list
						tables.map((table: TableInfo) => (
							<div
								key={table.name}
								className="group relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
							>
								<Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{table.name}</p>
									<p className="text-xs text-muted-foreground">
										{table.row_count.toLocaleString()} rows ·{" "}
										{table.column_count} columns
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => confirmDelete(table.name)}
									title="Delete table"
								>
									<Trash2 className="h-3.5 w-3.5 text-destructive" />
								</Button>
							</div>
						))
					)}
				</div>
			</ScrollArea>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Dataset</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the table "{tableToDelete}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
