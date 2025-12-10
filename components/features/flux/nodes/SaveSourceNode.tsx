"use client";

import { Handle, Position, NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProject } from '@/hooks/use-project';
import { useDatasets } from '@/hooks/use-datasets';
import { toast } from 'sonner';

export function SaveSourceNode({ data, isConnectable }: NodeProps) {
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentProjectPath } = useProject();
  const { loadTables } = useDatasets();

  // 'data.sourceView' should be populated by the incoming edge connection logic
  const sourceView = data.sourceView as string; 

  const handleSave = async () => {
    if (!sourceView || !tableName || !currentProjectPath) return;
    setLoading(true);
    try {
      await invoke('save_view_as_table', {
        projectPath: currentProjectPath,
        sourceView: sourceView,
        newTableName: tableName
      });
      toast.success(`Table "${tableName}" created successfully!`);
      // Refresh tables using loadTables
      await loadTables(currentProjectPath);
    } catch (error) {
      toast.error(`Failed to save table: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="min-w-[250px] border-green-500/50 bg-card">
      <div className="absolute -top-3 left-4 px-2 bg-background text-xs font-bold text-green-500 border border-green-500/50 rounded-full">
        OUTPUT
      </div>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Save to Database</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="text-xs text-muted-foreground">
          Source: <span className="font-mono text-foreground">{sourceView || "Not connected"}</span>
        </div>
        <Input 
          placeholder="New Table Name" 
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="h-8 text-xs"
        />
        <Button 
          size="sm" 
          className="w-full h-7 text-xs" 
          onClick={handleSave}
          disabled={loading || !sourceView}
        >
          {loading ? "Saving..." : "Commit Table"}
        </Button>
      </CardContent>
      
      {/* Input Handle only - this is an End Node */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />
    </Card>
  );
}
