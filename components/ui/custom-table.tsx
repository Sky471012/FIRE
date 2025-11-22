import React from "react";

interface CustomTableProps {
	children: React.ReactNode;
}

export function CustomTable({ children, ...props }: CustomTableProps & React.TableHTMLAttributes<HTMLTableElement>) {
	return (
		<div className="my-4 w-full overflow-x-auto rounded-lg border-2 border-border bg-card">
			<table className="custom-table" {...props}>
				{children}
			</table>
		</div>
	);
}

