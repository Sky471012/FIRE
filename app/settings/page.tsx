"use client";

import { ChildWindowControls } from "@/components/features/window/ChildWindowControls";
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
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { Palette, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = "general" | "appearance";

export default function SettingsPage() {
	const { settings, loading, updateGeneralSettings, updateAppearanceSettings } =
		useSettings();
	const [selectedCategory, setSelectedCategory] = useState<Category>("general");
	const [userName, setUserName] = useState("");
	const [theme, setTheme] = useState("system");
	const [fontSize, setFontSize] = useState(14);

	// Update local state when settings are loaded
	useEffect(() => {
		if (settings) {
			setUserName(settings.general.user_name);
			setTheme(settings.appearance.theme);
			setFontSize(settings.appearance.font_size);
		}
	}, [settings]);

	const handleUserNameChange = async (value: string) => {
		setUserName(value);
		try {
			await updateGeneralSettings(value);
			toast.success("Name updated successfully");
		} catch (error) {
			toast.error("Failed to update name");
			console.error(error);
		}
	};

	const handleThemeChange = async (value: string) => {
		setTheme(value);
		try {
			await updateAppearanceSettings(value, fontSize);
			toast.success("Theme updated successfully");
		} catch (error) {
			toast.error("Failed to update theme");
			console.error(error);
		}
	};

	const handleFontSizeChange = async (value: string) => {
		const size = Number.parseInt(value, 10);
		setFontSize(size);
		try {
			await updateAppearanceSettings(theme, size);
			toast.success("Font size updated successfully");
		} catch (error) {
			toast.error("Failed to update font size");
			console.error(error);
		}
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
				className="flex items-center justify-between h-9 bg-accent/10 border-b border-border/50 px-3"
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
									</div>
								)}

								{selectedCategory === "appearance" && (
									<div className="space-y-6">
										<div>
											<h2 className="text-2xl font-bold">Appearance</h2>
											<p className="text-sm text-muted-foreground">
												Customize how FIRE looks on your device
											</p>
										</div>

										<Separator />

										<div className="space-y-6">
											<div className="space-y-2">
												<Label htmlFor="theme">Theme</Label>
												<Select value={theme} onValueChange={handleThemeChange}>
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

											<div className="space-y-2">
												<Label htmlFor="font-size">Font Size</Label>
												<Select
													value={fontSize.toString()}
													onValueChange={handleFontSizeChange}
												>
													<SelectTrigger id="font-size" className="max-w-md">
														<SelectValue placeholder="Select font size" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="12">12px</SelectItem>
														<SelectItem value="14">14px</SelectItem>
														<SelectItem value="16">16px</SelectItem>
														<SelectItem value="18">18px</SelectItem>
														<SelectItem value="20">20px</SelectItem>
													</SelectContent>
												</Select>
												<p className="text-xs text-muted-foreground">
													Adjust the default font size.
												</p>
											</div>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

