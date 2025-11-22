"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TransfersDialog } from "./TransfersDialog";
import { useTransfers } from "@/hooks/use-transfers";

export function TransfersButton() {
	const { transfers, isLoggedIn, refresh } = useTransfers();
	const [open, setOpen] = useState(false);

	// Don't show button if user is not logged in
	if (!isLoggedIn) {
		return null;
	}

	const pendingCount = transfers.length;

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="relative h-8 w-8"
				onClick={() => setOpen(true)}
			>
				<Download className="h-4 w-4" />
				{pendingCount > 0 && (
					<Badge
						variant="destructive"
						className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
					>
						{pendingCount > 9 ? "9+" : pendingCount}
					</Badge>
				)}
			</Button>
			<TransfersDialog
				open={open}
				onOpenChange={setOpen}
				transfers={transfers}
				onTransferUpdate={refresh}
			/>
		</>
	);
}
