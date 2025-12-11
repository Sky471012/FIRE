"use client";

import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/hooks/use-project";
import { useDatasets } from "@/hooks/use-datasets";

export function DatasetSourceNode({ data, isConnectable, id }: NodeProps) {
    const { currentProjectPath } = useProject();
    const { tables, loadTables, isLoading } = useDatasets();
    const [selectedTable, setSelectedTable] = useState((data.sourceView as string) || "");
    const { updateNodeData } = useReactFlow();

    useEffect(() => {
        if (currentProjectPath) {
            loadTables(currentProjectPath);
        }
    }, [currentProjectPath, loadTables]);

    const handleValueChange = (value: string) => {
        setSelectedTable(value);
        updateNodeData(id, { sourceView: value, outputView: value });
    };

    return (
        <Card className="min-w-[200px] border-blue-500/50 bg-card">
            <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Data Source</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <Select
                    value={selectedTable}
                    onValueChange={handleValueChange}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Select Table" />
                    </SelectTrigger>
                    <SelectContent>
                        {tables.map((table) => (
                            <SelectItem key={table.name} value={table.name} className="text-xs">
                                {table.name} ({table.row_count} rows)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-blue-500 border-2 border-background"
            />
        </Card>
    );
}
