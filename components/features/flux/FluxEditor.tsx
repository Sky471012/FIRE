"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    Connection,
    Edge,
    Node,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { fileSystemApi } from "@/lib/filesystem-api";
import { DatasetSourceNode } from "./nodes/DatasetSourceNode";
import { SaveSourceNode } from "./nodes/SaveSourceNode";
import { FilterNode } from "./nodes/FilterNode";
import { NodeContextMenu } from "./NodeContextMenu";
import { InspectorNode } from "./nodes/InspectorNode";
import { toast } from "sonner"; // Assuming sonner is used for toasts
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

const nodeTypes = {
    save: SaveSourceNode,
    source: DatasetSourceNode,
    filter: FilterNode,
    inspector: InspectorNode,
};

let id = 0;
const getId = () => `dndnode_${id++}_${Date.now()}`;

interface FluxEditorProps {
    path: string;
}

function FluxFlow({ path }: FluxEditorProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { screenToFlowPosition, getNode } = useReactFlow();
    const [isLoaded, setIsLoaded] = useState(false);

    // Load initial state
    useEffect(() => {
        const loadFile = async () => {
            try {
                const content = await fileSystemApi.readFileContent(path);
                if (content) {
                    const flow = JSON.parse(content);
                    if (flow.nodes && flow.edges) {
                        setNodes(flow.nodes);
                        setEdges(flow.edges);
                    }
                }
            } catch (error) {
                console.error("Failed to load flux file:", error);
                toast.error("Failed to load pipeline");
            } finally {
                setIsLoaded(true);
            }
        };
        loadFile();
    }, [path, setNodes, setEdges]);

    // Auto-save logic
    // We track changes. A simple way is to use a debounced effect on nodes/edges.
    // But strictly, we need to know if it Changed from *initial* load.
    // For now, save on every change with debounce.

    useEffect(() => {
        if (!isLoaded) return;

        const saveTimer = setTimeout(async () => {
            const flow = { nodes, edges };
            try {
                await fileSystemApi.writeFileContent(path, JSON.stringify(flow, null, 2));
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, 1000);

        return () => clearTimeout(saveTimer);
    }, [nodes, edges, path, isLoaded]);

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge(params, eds));

            const sourceNode = getNode(params.source);
            if (sourceNode?.data?.outputView) {
                setNodes((nds) =>
                    nds.map((node) => {
                        if (node.id === params.target) {
                            const baseStyle = node.style || {};
                            // Ensure inspector nodes have fixed dimensions if missing
                            const style =
                                node.type === "inspector" && !baseStyle.width
                                    ? { ...baseStyle, width: 400, height: 300 }
                                    : baseStyle;

                            return {
                                ...node,
                                style,
                                data: {
                                    ...node.data,
                                    sourceView: sourceNode.data.outputView,
                                },
                            };
                        }
                        return node;
                    }),
                );
            }
        },
        [setEdges, getNode, setNodes],
    );

    // Listen for add node events from palette (Click to Add)
    useEffect(() => {
        const handleAddNode = (event: Event) => {
            const customEvent = event as CustomEvent<{ type: string }>;
            const type = customEvent.detail.type;

            if (!type) {
                return;
            }

            // Calculate center position
            // For simplicity, we just use a slight offset from top-left or try to center within current view
            // We can use the project() function to map screen center to flow coords,
            // but without specific screen dims here easily accessible in this scope (except via screenToFlowPosition with dummy coords)
            // let's just create it at a default visual spot or randomized to avoid overlap.
            // Better: Use useReactFlow().getViewport().

            // Since we are inside the component, we can use screenToFlowPosition if we had mouse coords.
            // But we don't.

            // Let's use a random position near the center or just (100, 100) + offset
            // A simple fallback is (100, 100)

            const newNode: Node = {
                id: getId(),
                type,
                position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
                data: { label: `${type} node`, sourceView: "" },
                style: type === "inspector" ? { width: 400, height: 300 } : undefined,
            };

            setNodes((nds) => nds.concat(newNode));
        };

        window.addEventListener("flux-add-node", handleAddNode);
        return () => window.removeEventListener("flux-add-node", handleAddNode);
    }, [setNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");

            if (typeof type === "undefined" || !type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: { label: `${type} node`, sourceView: "" },
                style: type === "inspector" ? { width: 400, height: 300 } : undefined,
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, setNodes],
    );

    const [menu, setMenu] = useState<{
        id: string;
        top: number;
        left: number;
    } | null>(null);

    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        // Prevent native context menu AND default browser context menu
        event.preventDefault();

        // Calculate position relative to the pane
        // We need absolute client coordinates or relative to container.
        // The context menu uses absolute positioning within the flow container (which is relative)
        // or we can use fixed positioning.
        // Let's use the event.clientX/Y from the container bounds.

        const pane = reactFlowWrapper.current?.getBoundingClientRect();
        if (pane) {
            setMenu({
                id: node.id,
                top: event.clientY - pane.top,
                left: event.clientX - pane.left,
            });
        }
    }, []);

    const onPaneClick = useCallback(() => setMenu(null), []);

    return (
        <div className="w-full h-full" ref={reactFlowWrapper}>
            <ReactFlow
                proOptions={{ hideAttribution: true }}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <Background />
                {menu && <NodeContextMenu {...menu} onClose={() => setMenu(null)} />}
                <div className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur border p-1 rounded-md">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                            const selectedNodes = nodes.filter((n) => n.selected);
                            const selectedEdges = edges.filter((e) => e.selected);

                            if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                                setNodes((nds) => nds.filter((n) => !n.selected));
                                setEdges((eds) => eds.filter((e) => !e.selected));
                                toast.success(`Deleted ${selectedNodes.length} nodes`);
                            }
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Selected"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </ReactFlow>
        </div>
    );
}

export function FluxEditor({ path }: { path: string }) {
    return (
        <ReactFlowProvider>
            <FluxFlow path={path} />
        </ReactFlowProvider>
    );
}
