"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { useEffect, useState } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { ActivityBar } from "@/components/layout/ActivityBar";
import { PrimarySideBar } from "@/components/layout/PrimarySideBar";
import { SecondarySideBar } from "@/components/layout/SecondarySideBar";
import { StatusBar } from "@/components/layout/StatusBar";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isTauri, setIsTauri] = useState(false);

	useEffect(() => {
		setIsTauri(typeof window !== "undefined" && window.isTauri);
	}, []);

	return (
		<html lang="en">
			<body className="overflow-hidden">
				<div className="h-screen flex flex-col">
					{isTauri && <TitleBar />}
					<div className="flex flex-1 overflow-hidden">
						<ActivityBar />
						<PrimarySideBar />
						<main className="flex-1 overflow-auto bg-background">
							{children}
						</main>
						<SecondarySideBar />
					</div>
					<StatusBar />
				</div>
			</body>
		</html>
	);
}
