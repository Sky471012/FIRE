"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";

interface NodeContextMenuProps {
    id: string;
    top: number;
    left: number;
    onClose: () => void;
}

export function NodeContextMenu({ id, top, left, onClose }: NodeContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { setNodes, setEdges } = useReactFlow();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleDelete = () => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
        toast.success("Node deleted");
        onClose();
    };

    return (
        <div
            ref={ref}
            style={{ top, left }}
            className="absolute z-50 min-w-[120px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95"
        >
            <Button
                variant="ghost"
                className="w-full justify-start h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                onClick={handleDelete}
            >
                <Trash className="h-3 w-3" />
                Delete Node
            </Button>
        </div>
    );
}
