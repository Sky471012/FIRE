"use client";

import { invoke } from "@tauri-apps/api/core";
import { Palette, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/features/auth/AuthDialog";
import { ChildWindowControls } from "@/components/features/window/ChildWindowControls";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

type Category = "general" | "appearance";

export default function SettingsPage() {
	const { settings, loading, updateGeneralSettings, updateAppearanceSettings } =
		useSettings();
	const { theme: currentTheme, setTheme: setNextTheme } = useTheme();
	const [selectedCategory, setSelectedCategory] = useState<Category>("general");
	const [userName, setUserName] = useState("");
	const [showStatusBar, setShowStatusBar] = useState(true);
	const [statusBarRefreshMs, setStatusBarRefreshMs] = useState("2000");
	const [currentUser, setCurrentUser] = useState<string | null>(null);
	const [authDialogOpen, setAuthDialogOpen] = useState(false);
	const [checkingUser, setCheckingUser] = useState(true);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const statusBarDebounceRef = useRef<NodeJS.Timeout | null>(null);

	// Update local state when settings are loaded
	useEffect(() => {
		if (settings) {
			setUserName(settings.general.user_name);
			setShowStatusBar(settings.appearance.show_status_bar);
			setStatusBarRefreshMs(
				settings.appearance.status_bar_refresh_ms.toString(),
			);
		}
	}, [settings]);

	// Check for logged-in user on mount
	useEffect(() => {
		checkCurrentUser();
	}, []);

	const checkCurrentUser = async () => {
		setCheckingUser(true);
		try {
			const user = await invoke<string | null>("get_current_user");
			setCurrentUser(user);
		} catch (error) {
			console.error("Failed to check current user:", error);
			setCurrentUser(null);
		} finally {
			setCheckingUser(false);
		}
	};

	const handleLogout = async () => {
		try {
			await invoke<string>("sign_out");
			setCurrentUser(null);
			toast.success("Logged out successfully");
		} catch (error) {
			toast.error(`Logout failed: ${error}`);
		}
	};

	const handleAuthSuccess = () => {
		checkCurrentUser();
	};

	const handleUserNameChange = useCallback(
		(value: string) => {
			setUserName(value);

			// Clear existing timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// Set new timer to save after 500ms of no typing
			debounceTimerRef.current = setTimeout(async () => {
				try {
					await updateGeneralSettings(value);
					toast.success("Name updated successfully");
				} catch (error) {
					toast.error("Failed to update name");
					console.error(error);
				}
			}, 500);
		},
		[updateGeneralSettings],
	);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			if (statusBarDebounceRef.current) {
				clearTimeout(statusBarDebounceRef.current);
			}
		};
	}, []);

	const handleThemeChange = async (value: string) => {
		// Apply theme immediately in the UI
		setNextTheme(value);

		try {
			// Save to backend with all appearance settings
			await updateAppearanceSettings(
				value,
				settings?.appearance.font_size || 14,
				settings?.appearance.show_status_bar ?? true,
				settings?.appearance.status_bar_refresh_ms || 2000,
			);
			toast.success("Theme updated successfully");
		} catch (error) {
			toast.error("Failed to update theme");
			console.error(error);
		}
	};

	const handleShowStatusBarChange = async (value: boolean) => {
		setShowStatusBar(value);

		try {
			await updateAppearanceSettings(
				settings?.appearance.theme || "system",
				settings?.appearance.font_size || 14,
				value,
				settings?.appearance.status_bar_refresh_ms || 2000,
			);
			toast.success("Status bar setting updated");
		} catch (error) {
			toast.error("Failed to update status bar setting");
			console.error(error);
		}
	};

	const handleStatusBarRefreshChange = (value: string) => {
		setStatusBarRefreshMs(value);

		// Clear existing timer
		if (statusBarDebounceRef.current) {
			clearTimeout(statusBarDebounceRef.current);
		}

		// Set new timer to save after 500ms of no typing
		statusBarDebounceRef.current = setTimeout(async () => {
			const numValue = Number.parseInt(value);
			if (isNaN(numValue) || numValue < 100) {
				toast.error("Refresh interval must be at least 100ms");
				return;
			}

			try {
				await updateAppearanceSettings(
					settings?.appearance.theme || "system",
					settings?.appearance.font_size || 14,
					settings?.appearance.show_status_bar ?? true,
					numValue,
				);
				toast.success("Status bar refresh interval updated");
			} catch (error) {
				toast.error("Failed to update refresh interval");
				console.error(error);
			}
		}, 500);
	};

	const categories = [
		{
			id: "general" as Category,
			label: "General",
			icon: User,
		},
		{
			id: "appearance" as Category,
			label: "Appearance",
			icon: Palette,
		},
	];

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Title Bar for Child Window */}
			<div
				data-tauri-drag-region
				className="flex items-center justify-between h-9 bg-accent/10 border-b border-border/50 pl-3"
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Settings</span>
				</div>
				<ChildWindowControls />
			</div>

			{/* 2-Column Layout */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Sidebar - Categories */}
				<div className="w-48 border-r border-border bg-muted/30">
					<div className="p-2 space-y-1">
						{categories.map((category) => {
							const Icon = category.icon;
							return (
								<button
									key={category.id}
									type="button"
									onClick={() => setSelectedCategory(category.id)}
									className={cn(
										"w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
										selectedCategory === category.id
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
									)}
								>
									<Icon className="h-4 w-4" />
									{category.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Right Content Area */}
				<div className="flex-1 overflow-auto">
					<div className="p-6 max-w-2xl">
						{loading ? (
							<div className="space-y-6">
								<Skeleton className="h-8 w-48" />
								<Skeleton className="h-20 w-full" />
								<Skeleton className="h-20 w-full" />
							</div>
						) : (
							<div className="space-y-6">
								{selectedCategory === "general" && (
									<div className="space-y-6">
										<div>
											<h2 className="text-2xl font-bold">General</h2>
											<p className="text-sm text-muted-foreground">
												Manage your general preferences
											</p>
										</div>

										<Separator />

										<div className="space-y-4">
											<div className="space-y-2">
												<Label htmlFor="user-name">Your Name</Label>
												<Input
													id="user-name"
													type="text"
													placeholder="Enter your name"
													value={userName}
													onChange={(e) => handleUserNameChange(e.target.value)}
													className="max-w-md"
												/>
												<p className="text-xs text-muted-foreground">
													This name will be used throughout the application.
												</p>
											</div>
										</div>

										<Separator />

										<div className="space-y-4">
											<div>
												<h3 className="text-lg font-semibold mb-1">
													Cloud Account
												</h3>
												<p className="text-sm text-muted-foreground">
													Connect your cloud account for P2P file sharing
												</p>
											</div>

											{checkingUser ? (
												<Skeleton className="h-10 w-64" />
											) : currentUser ? (
												<div className="flex items-center justify-between max-w-md">
													<div className="space-y-0.5">
														<p className="text-sm font-medium">
															Logged in as <span className="text-primary">@{currentUser}</span>
														</p>
														<p className="text-xs text-muted-foreground">
															You can send files to other users
														</p>
													</div>
													<Button
														variant="outline"
														size="sm"
														onClick={handleLogout}
													>
														Logout
													</Button>
												</div>
											) : (
												<div className="flex items-center gap-4">
													<Button
														onClick={() => setAuthDialogOpen(true)}
													>
														Login / Sign Up
													</Button>
													<p className="text-xs text-muted-foreground">
														Create an account to enable cloud features
													</p>
												</div>
											)}
										</div>
									</div>
								)}

								{selectedCategory === "appearance" && (
									<div className="space-y-6">
										<div>
											<h2 className="text-2xl font-bold">Appearance</h2>
											<p className="text-sm text-muted-foreground">
												Customize how TIRE looks on your device
											</p>
										</div>

										<Separator />

										<div className="space-y-6">
											<div className="space-y-2">
												<Label htmlFor="theme">Theme</Label>
												<Select
													value={currentTheme}
													onValueChange={handleThemeChange}
												>
													<SelectTrigger id="theme" className="max-w-md">
														<SelectValue placeholder="Select theme" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="light">Light</SelectItem>
														<SelectItem value="dark">Dark</SelectItem>
														<SelectItem value="system">System</SelectItem>
													</SelectContent>
												</Select>
												<p className="text-xs text-muted-foreground">
													Select the theme for the application.
												</p>
											</div>

											<Separator />

											<div className="space-y-4">
												<div>
													<h3 className="text-lg font-semibold mb-1">
														Status Bar
													</h3>
													<p className="text-sm text-muted-foreground">
														Configure the status bar display and refresh rate
													</p>
												</div>

												<div className="flex items-center justify-between max-w-md">
													<div className="space-y-0.5">
														<Label htmlFor="show-status-bar">
															Show Status Bar
														</Label>
														<p className="text-xs text-muted-foreground">
															Display the status bar at the bottom of the window
														</p>
													</div>
													<Switch
														id="show-status-bar"
														checked={showStatusBar}
														onCheckedChange={handleShowStatusBarChange}
													/>
												</div>

												{showStatusBar && (
													<div className="space-y-2">
														<Label htmlFor="refresh-interval">
															Refresh Interval (milliseconds)
														</Label>
														<Input
															id="refresh-interval"
															type="number"
															min="100"
															step="100"
															placeholder="2000"
															value={statusBarRefreshMs}
															onChange={(e) =>
																handleStatusBarRefreshChange(e.target.value)
															}
															className="max-w-md"
														/>
														<p className="text-xs text-muted-foreground">
															How often to update CPU and RAM usage (minimum
															100ms).
														</p>
													</div>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Auth Dialog */}
			<AuthDialog
				open={authDialogOpen}
				onOpenChange={setAuthDialogOpen}
				onSuccess={handleAuthSuccess}
			/>
		</div>
	);
}
