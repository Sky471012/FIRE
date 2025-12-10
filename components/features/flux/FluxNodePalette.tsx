"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Filter,
  Save,
  Database,
  Eye,
  Brain,
  Code
} from "lucide-react";

const NODE_TYPES = [
  {
    type: "source",
    label: "Data Source",
    icon: Database,
    description: "Load a table/view"
  },
  {
    type: "filter",
    label: "Filter Operations",
    icon: Filter,
    description: "WHERE clauses"
  },
  {
    type: "ai",
    label: "AI Processing",
    icon: Brain,
    description: "LLM Transformations"
  },
  {
    type: "python",
    label: "Python Script",
    icon: Code,
    description: "Custom Logic"
  },
  {
    type: "inspector",
    label: "Data Inspector",
    icon: Eye,
    description: "Preview Data"
  },

  {
    type: "save",
    label: "Save Table",
    icon: Save,
    description: "Materialize View"
  }
];

export function FluxNodePalette() {

  return (
    <div className="h-full bg-background border-l border-border flex flex-col w-full">
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nodes
        </h2>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {NODE_TYPES.map((node) => (
            <div
              key={node.type}
              onClick={() => {
                window.dispatchEvent(
                    new CustomEvent("flux-add-node", { detail: { type: node.type } })
                );
              }}
              className="cursor-pointer active:scale-95 transition-transform"
            >
              <Card
                className="p-3 hover:bg-accent transition-colors border-dashed pointer-events-none select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <node.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">
                      {node.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {node.description}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          Click to add nodes to the canvas
        </p>
      </div>
    </div>
  );
}
