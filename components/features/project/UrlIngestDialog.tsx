"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface UrlIngestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (url: string, mode: "static" | "dynamic", maxDepth: number) => Promise<void>;
}

export function UrlIngestDialog({
	open,
	onOpenChange,
	onSubmit,
}: UrlIngestDialogProps) {
	const [url, setUrl] = useState("");
	const [mode, setMode] = useState<"static" | "dynamic">("static");
	const [maxDepth, setMaxDepth] = useState("2");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (!url.trim()) {
			setError("Please enter a valid URL");
			return;
		}

		const depth = Number.parseInt(maxDepth, 10);
		if (Number.isNaN(depth) || depth < 1 || depth > 10) {
			setError("Max depth must be between 1 and 10");
			return;
		}

		setIsLoading(true);
		try {
			await onSubmit(url.trim(), mode, depth);
			// Reset form on success
			setUrl("");
			setMode("static");
			setMaxDepth("2");
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		if (!isLoading) {
			setUrl("");
			setMode("static");
			setMaxDepth("2");
			setError(null);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Load Documentation from URL</DialogTitle>
						<DialogDescription>
							Enter a documentation website URL to crawl and ingest into your
							project's knowledge base.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{/* URL Input */}
						<div className="grid gap-2">
							<Label htmlFor="url">Documentation URL</Label>
							<Input
								id="url"
								type="url"
								placeholder="https://docs.example.com"
								value={url}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
								disabled={isLoading}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">
								The starting URL of the documentation site to crawl
							</p>
						</div>

						{/* Mode Selection */}
						<div className="grid gap-2">
							<Label htmlFor="mode">Crawl Mode</Label>
							<Select
								value={mode}
								onValueChange={(value: string) => setMode(value as "static" | "dynamic")}
								disabled={isLoading}
							>
								<SelectTrigger id="mode">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="static">Static (Faster)</SelectItem>
									<SelectItem value="dynamic">
										Dynamic (JavaScript-rendered)
									</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Static for regular HTML sites, Dynamic for JavaScript-heavy sites
							</p>
						</div>

						{/* Max Depth */}
						<div className="grid gap-2">
							<Label htmlFor="maxDepth">Maximum Depth</Label>
							<Input
								id="maxDepth"
								type="number"
								min="1"
								max="10"
								value={maxDepth}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxDepth(e.target.value)}
								disabled={isLoading}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">
								How many levels deep to crawl (1-10). Higher values take longer.
							</p>
						</div>

						{/* Error Message */}
						{error && (
							<div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
								{error}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Ingesting...
								</>
							) : (
								"Start Ingestion"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
