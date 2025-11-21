"use client";

import {
	BarChart3,
	Clock,
	Database,
	FileText,
	FileUp,
	FolderOpen,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function WelcomePage() {
	const quickActions = [
		{
			icon: FileUp,
			title: "Import Data",
			description: "Upload CSV, Excel, or NetCDF files",
			color: "text-blue-600",
			bgColor: "bg-blue-50 dark:bg-blue-950/30",
		},
		{
			icon: Database,
			title: "New Query",
			description: "Execute SQL queries on your datasets",
			color: "text-green-600",
			bgColor: "bg-green-50 dark:bg-green-950/30",
		},
		{
			icon: FolderOpen,
			title: "Open Project",
			description: "Browse and open existing projects",
			color: "text-purple-600",
			bgColor: "bg-purple-50 dark:bg-purple-950/30",
		},
		{
			icon: BarChart3,
			title: "Create Dashboard",
			description: "Visualize your data with charts",
			color: "text-orange-600",
			bgColor: "bg-orange-50 dark:bg-orange-950/30",
		},
	];

	const recentFiles = [
		{
			name: "climate_data.csv",
			type: "CSV",
			size: "2.4 MB",
			modified: "2 hours ago",
		},
		{
			name: "emissions.xlsx",
			type: "Excel",
			size: "1.8 MB",
			modified: "Yesterday",
		},
		{
			name: "analysis_results.nc",
			type: "NetCDF",
			size: "5.2 MB",
			modified: "2 days ago",
		},
	];

	return (
		<div className="h-full p-6 space-y-6 overflow-auto bg-background">
			{/* Welcome, Section */}
			<div className="space-y-2">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded flex items-center justify-center overflow-hidden">
						<Image
							src="/icon.png"
							alt="FIRE Icon"
							width={40}
							height={40}
							className="object-contain"
						/>
					</div>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Welcome to FIRE
						</h1>
						<p className="text-sm text-muted-foreground">
							Fast Interactive Research Environment
						</p>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
					Quick Actions
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					{quickActions.map((action) => (
						<Card
							key={action.title}
							className="group hover:border-primary/50 transition-colors cursor-pointer"
						>
							<CardHeader className="pb-3 space-y-2">
								<div
									className={`h-10 w-10 rounded ${action.bgColor} flex items-center justify-center`}
								>
									<action.icon className={`h-5 w-5 ${action.color}`} />
								</div>
								<CardTitle className="text-sm font-medium">
									{action.title}
								</CardTitle>
								<CardDescription className="text-xs">
									{action.description}
								</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>

			{/* Recent Files */}
			<div>
				<h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
					Recent Files
				</h2>
				<Card>
					<CardContent className="p-0">
						<div className="divide-y divide-border">
							{recentFiles.map((file) => (
								<div
									key={`${file.name}-${file.modified}`}
									className="p-3 hover:bg-accent transition-colors cursor-pointer flex items-center justify-between group"
								>
									<div className="flex items-center gap-3">
										<FileText className="h-4 w-4 text-muted-foreground" />
										<div>
											<p className="font-medium text-sm">{file.name}</p>
											<div className="flex items-center gap-2 mt-0.5">
												<Badge variant="secondary" className="text-xs">
													{file.type}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{file.size}
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Clock className="h-3 w-3" />
										<span>{file.modified}</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Getting Started */}
			<Card className="border-primary/30 bg-primary/5">
				<CardHeader>
					<CardTitle className="text-base">Getting Started</CardTitle>
					<CardDescription>
						New to FIRE? Here are some helpful resources
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Button variant="outline" className="w-full justify-start" size="sm">
						📚 View Documentation
					</Button>
					<Button variant="outline" className="w-full justify-start" size="sm">
						🎓 Tutorial: Import Your First Dataset
					</Button>
					<Button variant="outline" className="w-full justify-start" size="sm">
						💡 Tips & Tricks
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
