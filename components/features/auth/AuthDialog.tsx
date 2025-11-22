"use client";

import { invoke } from "@tauri-apps/api/core";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

interface AuthDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

type AuthMode = "login" | "signup" | "confirm";

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
	const [mode, setMode] = useState<AuthMode>("login");
	const [loading, setLoading] = useState(false);
	
	// Form fields
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [confirmCode, setConfirmCode] = useState("");

	const resetForm = () => {
		setUsername("");
		setPassword("");
		setEmail("");
		setConfirmCode("");
		setMode("login");
	};

	const handleClose = () => {
		resetForm();
		onOpenChange(false);
	};

	const handleLogin = async () => {
		if (!username || !password) {
			toast.error("Please fill in all fields");
			return;
		}

		setLoading(true);
		try {
			const result = await invoke<string>("sign_in", {
				username,
				password,
			});
			toast.success(result);
			handleClose();
			onSuccess?.();
		} catch (error) {
			toast.error(`Login failed: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const handleSignup = async () => {
		if (!username || !password || !email) {
			toast.error("Please fill in all fields");
			return;
		}

		setLoading(true);
		try {
			const result = await invoke<string>("sign_up", {
				username,
				password,
				email,
			});
			toast.success(result);
			// Switch to confirm mode
			setMode("confirm");
			setPassword(""); // Clear password for security
		} catch (error) {
			toast.error(`Sign up failed: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirm = async () => {
		if (!username || !confirmCode) {
			toast.error("Please enter the confirmation code");
			return;
		}

		setLoading(true);
		try {
			const result = await invoke<string>("confirm_sign_up", {
				username,
				code: confirmCode,
			});
			toast.success(result);
			// Switch to login mode after successful confirmation
			setMode("login");
			setConfirmCode("");
		} catch (error) {
			toast.error(`Confirmation failed: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (mode === "login") {
			await handleLogin();
		} else if (mode === "signup") {
			await handleSignup();
		} else if (mode === "confirm") {
			await handleConfirm();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{mode === "login" && "Login to TIRE"}
						{mode === "signup" && "Create Account"}
						{mode === "confirm" && "Confirm Account"}
					</DialogTitle>
					<DialogDescription>
						{mode === "login" && "Sign in to access cloud features"}
						{mode === "signup" && "Create a new TIRE account"}
						{mode === "confirm" && "Enter the confirmation code sent to your email"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{mode !== "confirm" && (
						<>
							<div className="space-y-2">
								<Label htmlFor="username">Username</Label>
								<Input
									id="username"
									type="text"
									placeholder="Enter username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									disabled={loading}
									autoComplete="username"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									placeholder="Enter password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={loading}
									autoComplete={mode === "login" ? "current-password" : "new-password"}
								/>
							</div>

							{mode === "signup" && (
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="Enter email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										disabled={loading}
										autoComplete="email"
									/>
								</div>
							)}
						</>
					)}

					{mode === "confirm" && (
						<div className="space-y-2">
							<Label htmlFor="confirmCode">Confirmation Code</Label>
							<Input
								id="confirmCode"
								type="text"
								placeholder="Enter code from email"
								value={confirmCode}
								onChange={(e) => setConfirmCode(e.target.value)}
								disabled={loading}
								autoComplete="off"
							/>
							<p className="text-sm text-muted-foreground">
								Username: {username}
							</p>
						</div>
					)}

					<div className="flex flex-col gap-2">
						<Button type="submit" disabled={loading} className="w-full">
							{loading && <Spinner className="mr-2 h-4 w-4" />}
							{mode === "login" && "Sign In"}
							{mode === "signup" && "Sign Up"}
							{mode === "confirm" && "Confirm"}
						</Button>

						{mode !== "confirm" && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => {
									setMode(mode === "login" ? "signup" : "login");
									setPassword("");
									setEmail("");
								}}
								disabled={loading}
								className="w-full"
							>
								{mode === "login"
									? "Don't have an account? Sign up"
									: "Already have an account? Sign in"}
							</Button>
						)}

						{mode === "confirm" && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => {
									setMode("login");
									setConfirmCode("");
								}}
								disabled={loading}
								className="w-full"
							>
								Back to login
							</Button>
						)}
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
