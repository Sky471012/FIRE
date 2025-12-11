import "@/styles/globals.css";
import type * as React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // This is a minimal root layout that just passes through to nested layouts
    // Routes under (main)/ will get the full app layout with sidebars
    // Routes like /settings and /demo-dialog will get their own minimal layouts
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="overflow-hidden">{children}</body>
        </html>
    );
}
