"use client";

import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProject } from "@/hooks/use-project";
import { toast } from "sonner";

export function FilterNode({ data, isConnectable, id }: NodeProps) {
    const [whereClause, setWhereClause] = useState((data.whereClause as string) || "");
    const [loading, setLoading] = useState(false);
    const { currentProjectPath } = useProject();
    const { updateNodeData } = useReactFlow();

    const sourceView = data.sourceView as string;

    // We should ideally debounce this or only run on "Apply" to avoid too many view creations.
    // Let's use an "Apply Filter" button for explicit action.

    const handleApply = async () => {
        if (!sourceView || !whereClause || !currentProjectPath) return;

        setLoading(true);
        const newViewName = `view_${id}_${Date.now()}`;
        const sqlQuery = `SELECT * FROM ${sourceView} WHERE ${whereClause}`;

        try {
            await invoke("create_flux_view", {
                projectPath: currentProjectPath,
                viewName: newViewName,
                sqlQuery: sqlQuery,
            });

            // Update output data
            updateNodeData(id, {
                outputView: newViewName,
                whereClause: whereClause, // Persist state
            });

            toast.success("Filter applied");
        } catch (error) {
            console.error(error);
            toast.error(`Filter failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Update local state if data changes externally (e.g. load from file)
    useEffect(() => {
        if (data.whereClause && data.whereClause !== whereClause) {
            setWhereClause(data.whereClause as string);
        }
    }, [data.whereClause]);

    return (
        <Card className="min-w-[250px] border-orange-500/50 bg-card">
            <div className="absolute -top-3 left-4 px-2 bg-background text-xs font-bold text-orange-500 border border-orange-500/50 rounded-full">
                TRANSFORM
            </div>
            <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">Filter (WHERE)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
                <div
                    className="text-xs text-muted-foreground truncate"
                    title={sourceView || "Not connected"}
                >
                    Source:{" "}
                    <span className="font-mono text-foreground">
                        {sourceView || "Not connected"}
                    </span>
                </div>

                <div className="flex gap-1 items-center">
                    <span className="text-xs font-mono font-bold text-muted-foreground">WHERE</span>
                    <Input
                        placeholder="e.g. age > 25"
                        value={whereClause}
                        onChange={(e) => setWhereClause(e.target.value)}
                        className="h-7 text-xs font-mono"
                    />
                </div>

                <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-7 text-xs"
                    onClick={handleApply}
                    disabled={loading || !sourceView || !whereClause}
                >
                    {loading ? "Applying..." : "Apply Filter"}
                </Button>
            </CardContent>

            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-orange-500 border-2 border-background"
            />

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-orange-500 border-2 border-background"
            />
        </Card>
    );
}
