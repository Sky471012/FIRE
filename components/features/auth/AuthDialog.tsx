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

type AuthMode = "login" | "signup" | "confirm" | "forgot-password" | "reset-password";

interface PasswordValidation {
    isValid: boolean;
    errors: string[];
}

/**
 * Validates password against AWS Cognito requirements
 * - At least 8 characters
 * - At least 1 number
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 special character: ^ $ * . [ ] { } ( ) ? - " ! @ # % & / \ , > < ' : ; | _ ~ ` + = (and space)
 */
function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    // Check length
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    // Check for at least 1 number
    if (!/\d/.test(password)) {
        errors.push("Password must contain at least 1 number");
    }

    // Check for at least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least 1 uppercase letter");
    }

    // Check for at least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least 1 lowercase letter");
    }

    // Check for at least 1 special character
    // Special characters: ^ $ * . [ ] { } ( ) ? - " ! @ # % & / \ , > < ' : ; | _ ~ ` + = and space (non-leading, non-trailing)
    const specialChars = /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=\s]/;
    if (!specialChars.test(password)) {
        errors.push(
            "Password must contain at least 1 special character (^ $ * . [ ] { } ( ) ? - \" ! @ # % & / \\ , > < ' : ; | _ ~ ` + = or space)",
        );
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Component to display password requirements with real-time validation
 */
function PasswordRequirements({ password }: { password: string }) {
    const requirements = [
        { test: (p: string) => p.length >= 8, text: "At least 8 characters" },
        { test: (p: string) => /\d/.test(p), text: "At least 1 number" },
        {
            test: (p: string) => /[A-Z]/.test(p),
            text: "At least 1 uppercase letter",
        },
        {
            test: (p: string) => /[a-z]/.test(p),
            text: "At least 1 lowercase letter",
        },
        {
            test: (p: string) => /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=\s]/.test(p),
            text: "At least 1 special character",
        },
    ];

    return (
        <div className="text-xs space-y-1 mt-2">
            <p className="font-medium text-muted-foreground">Password requirements:</p>
            {requirements.map((req, index) => {
                const isValid = password ? req.test(password) : false;
                return (
                    <div key={index} className="flex items-center gap-1.5">
                        <div
                            className={`w-1 h-1 rounded-full ${isValid ? "bg-green-500" : "bg-muted-foreground/50"}`}
                        />
                        <span
                            className={
                                isValid
                                    ? "text-green-600 dark:text-green-500"
                                    : "text-muted-foreground"
                            }
                        >
                            {req.text}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
    const [mode, setMode] = useState<AuthMode>("login");
    const [loading, setLoading] = useState(false);

    // Form fields
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [confirmCode, setConfirmCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setEmail("");
        setConfirmCode("");
        setNewPassword("");
        setConfirmPassword("");
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

        // Validate password
        const validation = validatePassword(password);
        if (!validation.isValid) {
            // Show all validation errors
            validation.errors.forEach((error) => {
                toast.error(error);
            });
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

    const handleForgotPassword = async () => {
        if (!username) {
            toast.error("Please enter your username");
            return;
        }

        setLoading(true);
        try {
            const result = await invoke<string>("forgot_password", {
                username,
            });
            toast.success(result);
            // Switch to reset password mode
            setMode("reset-password");
        } catch (error) {
            toast.error(`Failed to send reset code: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!username || !confirmCode || !newPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        // Validate password against AWS Cognito requirements
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            // Show all validation errors
            validation.errors.forEach((error) => {
                toast.error(error);
            });
            return;
        }

        setLoading(true);
        try {
            const result = await invoke<string>("confirm_forgot_password", {
                username,
                code: confirmCode,
                newPassword,
            });
            toast.success(result);
            // Switch to login mode after successful reset
            setMode("login");
            setConfirmCode("");
            setNewPassword("");
            setConfirmPassword("");
            setPassword("");
        } catch (error) {
            toast.error(`Password reset failed: ${error}`);
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
        } else if (mode === "forgot-password") {
            await handleForgotPassword();
        } else if (mode === "reset-password") {
            await handleResetPassword();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className="sm:max-w-[425px]"
                onInteractOutside={(e) => {
                    // Prevent closing when clicking outside the dialog
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {mode === "login" && "Login to FIRE"}
                        {mode === "signup" && "Create Account"}
                        {mode === "confirm" && "Confirm Account"}
                        {mode === "forgot-password" && "Reset Password"}
                        {mode === "reset-password" && "Set New Password"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "login" && "Sign in to access cloud features"}
                        {mode === "signup" && "Create a new FIRE account"}
                        {mode === "confirm" && "Enter the confirmation code sent to your email"}
                        {mode === "forgot-password" &&
                            "Enter your username to receive a password reset code"}
                        {mode === "reset-password" &&
                            "Enter the code from your email and your new password"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Login and Signup modes */}
                    {(mode === "login" || mode === "signup") && (
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
                                    autoComplete={
                                        mode === "login" ? "current-password" : "new-password"
                                    }
                                />
                                {mode === "signup" && <PasswordRequirements password={password} />}
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

                    {/* Confirm signup mode */}
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
                            <p className="text-sm text-muted-foreground">Username: {username}</p>
                        </div>
                    )}

                    {/* Forgot password mode - just username */}
                    {mode === "forgot-password" && (
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>
                    )}

                    {/* Reset password mode - code and new password */}
                    {mode === "reset-password" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="confirmCode">Reset Code</Label>
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

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <PasswordRequirements password={newPassword} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Passwords do not match
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-2">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading && <Spinner className="mr-2 h-4 w-4" />}
                            {mode === "login" && "Sign In"}
                            {mode === "signup" && "Sign Up"}
                            {mode === "confirm" && "Confirm"}
                            {mode === "forgot-password" && "Send Reset Code"}
                            {mode === "reset-password" && "Reset Password"}
                        </Button>

                        {/* Login mode - show signup and forgot password links */}
                        {mode === "login" && (
                            <>
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => {
                                        setMode("forgot-password");
                                        setPassword("");
                                    }}
                                    disabled={loading}
                                    className="w-full text-sm"
                                >
                                    Forgot password?
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setMode("signup");
                                        setPassword("");
                                        setEmail("");
                                    }}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Don't have an account? Sign up
                                </Button>
                            </>
                        )}

                        {/* Signup mode - back to login */}
                        {mode === "signup" && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setMode("login");
                                    setPassword("");
                                    setEmail("");
                                }}
                                disabled={loading}
                                className="w-full"
                            >
                                Already have an account? Sign in
                            </Button>
                        )}

                        {/* Confirm mode - back to login */}
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

                        {/* Forgot password mode - back to login */}
                        {mode === "forgot-password" && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setMode("login");
                                }}
                                disabled={loading}
                                className="w-full"
                            >
                                Back to login
                            </Button>
                        )}

                        {/* Reset password mode - back to login */}
                        {mode === "reset-password" && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setMode("login");
                                    setConfirmCode("");
                                    setNewPassword("");
                                    setConfirmPassword("");
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
