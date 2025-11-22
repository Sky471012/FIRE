"use client";

import { Activity, Bell, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SecondarySideBar() {
	return (
		<div className="h-full bg-background border-l border-border flex flex-col">
			{/* Header */}
			<div className="px-4 py-2 border-b border-border">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Information
				</h2>
			</div>

			{/* Content */}
			<Tabs defaultValue="notifications" className="flex-1 flex flex-col">
				<TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-9">
					<TabsTrigger
						value="notifications"
						className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9"
					>
						<Bell className="h-3.5 w-3.5 mr-1.5" />
						Alerts
					</TabsTrigger>
					<TabsTrigger
						value="activity"
						className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9"
					>
						<Activity className="h-3.5 w-3.5 mr-1.5" />
						Activity
					</TabsTrigger>
					<TabsTrigger
						value="info"
						className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9"
					>
						<Info className="h-3.5 w-3.5 mr-1.5" />
						Info
					</TabsTrigger>
				</TabsList>

				<ScrollArea className="flex-1">
					<TabsContent value="notifications" className="p-3 space-y-2 m-0">
						<Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
							<div className="flex items-start gap-2">
								<Badge variant="secondary" className="text-xs">
									Info
								</Badge>
								<div className="flex-1">
									<p className="text-xs font-medium">New dataset available</p>
									<p className="text-xs text-muted-foreground mt-1">
										Climate data for 2024 has been updated
									</p>
								</div>
							</div>
						</Card>

						<Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
							<div className="flex items-start gap-2">
								<Badge variant="secondary" className="text-xs">
									Success
								</Badge>
								<div className="flex-1">
									<p className="text-xs font-medium">Import completed</p>
									<p className="text-xs text-muted-foreground mt-1">
										Successfully imported 1,234 records
									</p>
								</div>
							</div>
						</Card>
					</TabsContent>

					<TabsContent value="activity" className="p-3 space-y-3 m-0">
						<div className="space-y-3">
							<div className="flex items-start gap-3">
								<div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-xs">
										File opened:{" "}
										<span className="font-medium">climate_data.csv</span>
									</p>
									<p className="text-xs text-muted-foreground">2 minutes ago</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="h-2 w-2 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-xs">Query executed successfully</p>
									<p className="text-xs text-muted-foreground">5 minutes ago</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="h-2 w-2 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-xs">Dashboard view updated</p>
									<p className="text-xs text-muted-foreground">
										10 minutes ago
									</p>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="info" className="p-3 m-0">
						<Card className="p-3">
							<h3 className="font-semibold text-xs mb-2">About FIRE</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Fast Integrated Research Environment - Your powerful data
								analysis platform
							</p>
						</Card>
					</TabsContent>
				</ScrollArea>
			</Tabs>
		</div>
	);
}
