"use client";

import { invoke } from "@tauri-apps/api/core";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useProject } from "@/hooks/use-project";

interface Transfer {
	recipient_username: string;
	timestamp: string;
	sender: string;
	code: string;
}

interface TransfersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transfers: Transfer[];
	onTransferUpdate: () => void;
}

export function TransfersDialog({
	open,
	onOpenChange,
	transfers,
	onTransferUpdate,
}: TransfersDialogProps) {
	const { currentProjectPath } = useProject();
	const [acceptingCode, setAcceptingCode] = useState<string | null>(null);
	const [rejectingTimestamp, setRejectingTimestamp] = useState<string | null>(
		null,
	);

	const handleAccept = async (transfer: Transfer) => {
		setAcceptingCode(transfer.code);
		try {
			const result = await invoke<string>("accept_transfer", {
				code: transfer.code,
				recipientUsername: transfer.recipient_username,
				timestamp: transfer.timestamp,
				projectPath: currentProjectPath,
			});
			toast.success(result);
			onTransferUpdate(); // Refresh the transfer list
		} catch (error) {
			toast.error(`Failed to receive file: ${error}`);
		} finally {
			setAcceptingCode(null);
		}
	};

	const handleReject = async (transfer: Transfer) => {
		setRejectingTimestamp(transfer.timestamp);
		try {
			await invoke<string>("reject_transfer", {
				recipientUsername: transfer.recipient_username,
				timestamp: transfer.timestamp,
			});
			toast.success("Transfer rejected");
			onTransferUpdate(); // Refresh the transfer list
		} catch (error) {
			toast.error(`Failed to reject transfer: ${error}`);
		} finally {
			setRejectingTimestamp(null);
		}
	};

	const formatTimestamp = (timestamp: string) => {
		try {
			const date = new Date(timestamp);
			return date.toLocaleString();
		} catch {
			return timestamp;
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Incoming File Transfers</DialogTitle>
					<DialogDescription>
						Accept or reject files sent to you
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[400px] pr-4">
					{transfers.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Download className="h-12 w-12 text-muted-foreground mb-2" />
							<p className="text-sm text-muted-foreground">
								No pending transfers
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{transfers.map((transfer) => (
								<div
									key={transfer.timestamp}
									className="flex items-start gap-3 p-3 rounded-lg border bg-card"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="font-medium text-sm">
												From: {transfer.sender}
											</p>
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											{formatTimestamp(transfer.timestamp)}
										</p>
										<p className="text-xs font-mono mt-1 text-muted-foreground">
											Code: {transfer.code}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={() => handleAccept(transfer)}
											disabled={
												acceptingCode === transfer.code ||
												rejectingTimestamp === transfer.timestamp
											}
										>
											{acceptingCode === transfer.code ? (
												<>
													<Spinner className="mr-2 h-3 w-3" />
													Receiving...
												</>
											) : (
												<>
													<Download className="mr-2 h-3 w-3" />
													Accept
												</>
											)}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleReject(transfer)}
											disabled={
												acceptingCode === transfer.code ||
												rejectingTimestamp === transfer.timestamp
											}
										>
											{rejectingTimestamp === transfer.timestamp ? (
												<Spinner className="h-3 w-3" />
											) : (
												<X className="h-3 w-3" />
											)}
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
