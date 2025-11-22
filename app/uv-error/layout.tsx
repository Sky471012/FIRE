import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "UV Installation Required",
	description: "UV package manager is required for this application",
};

export default function UvErrorLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
