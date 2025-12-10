"use client";

import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProject } from '@/hooks/use-project';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileJson, Table as TableIcon } from 'lucide-react';

interface SchemaItem {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    dflt_value: any;
    pk: boolean;
}

export function InspectorNode({ data, isConnectable }: NodeProps) {
  const [activeTab, setActiveTab] = useState("data");
  const [schema, setSchema] = useState<SchemaItem[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentProjectPath } = useProject();

  const sourceView = data.sourceView as string;

  const fetchData = async () => {
    if (!sourceView || !currentProjectPath) return;

    setLoading(true);
    try {
        if (activeTab === "data") {
            // Fetch Data Preview
             const result = await invoke<{ columns: string[], rows: any[][] }>('preview_flux_view', {
                projectPath: currentProjectPath,
                viewName: sourceView,
                limit: 50
            });
            setColumns(result.columns);
            setPreviewData(result.rows);
        } else {
             // Fetch Schema
             const result = await invoke<SchemaItem[]>('get_view_schema', {
                projectPath: currentProjectPath,
                tableName: sourceView,
            });
            setSchema(result);
        }
    } catch (error) {
        console.error("Inspector Error:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, [sourceView, currentProjectPath, activeTab]);

  return (
    <div className="h-full w-full">
        <NodeResizer 
            color="#14b8a6" 
            isVisible={true} 
            minWidth={400} 
            minHeight={300} 
        />
        <Card className="w-full h-full border-teal-500/50 bg-card shadow-lg flex flex-col overflow-hidden">
           <div className="absolute -top-3 left-4 px-2 bg-background text-xs font-bold text-teal-500 border border-teal-500/50 rounded-full z-10">
            INSPECT
          </div>
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 bg-muted/5">
            <CardTitle className="text-sm flex items-center gap-2">
                <span className="truncate max-w-[150px]" title={sourceView}>{sourceView || "No Input"}</span>
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-6">
                <TabsList className="h-6 p-0 bg-muted/50">
                    <TabsTrigger value="data" className="h-6 text-[10px] px-2 data-[state=active]:bg-background">
                        <TableIcon className="w-3 h-3 mr-1" /> Data
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="h-6 text-[10px] px-2 data-[state=active]:bg-background">
                        <FileJson className="w-3 h-3 mr-1" /> Schema
                    </TabsTrigger>
                </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex-1 min-h-0 flex flex-col">
            {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Loading...
                </div>
            ) : !sourceView ? (
                 <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Connect a source node
                </div>
            ) : (
                <ScrollArea 
                    className="h-full w-full rounded-md border bg-muted/10 nodrag nowheel overflow-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {activeTab === "data" ? (
                        <div className="text-xs min-w-max">
                             {columns.length > 0 ? (
                                 <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                        <tr>
                                            {columns.map(col => (
                                                <th key={col} className="border-b px-2 py-1 font-medium bg-muted/20 whitespace-nowrap">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-muted/20">
                                                {row.map((cell: any, j: number) => (
                                                    <td key={j} className="border-b border-border/50 px-2 py-1 max-w-[200px] truncate whitespace-nowrap">{String(cell)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             ) : (
                                 <div className="text-center py-4 text-muted-foreground">No data available</div>
                             )}
                        </div>
                    ) : (
                        <div className="text-xs font-mono min-w-max">
                            {schema.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                        <tr>
                                            <th className="border-b px-2 py-1">Column</th>
                                            <th className="border-b px-2 py-1">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schema.map((col) => (
                                            <tr key={col.name}>
                                                <td className="border-b border-border/50 px-2 py-1 text-primary">{col.name}</td>
                                                <td className="border-b border-border/50 px-2 py-1 text-muted-foreground">{col.type}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">No schema info</div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            )}
          </CardContent>
          
          <Handle
            type="target"
            position={Position.Left}
            isConnectable={isConnectable}
            className="w-3 h-3 bg-teal-500 border-2 border-background"
          />
        </Card>
    </div>
  );
}
