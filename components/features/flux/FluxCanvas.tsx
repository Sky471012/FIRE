"use client";

import { useCallback, useRef } from "react";
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

import { DatasetSourceNode } from "./nodes/DatasetSourceNode";
import { SaveSourceNode } from "./nodes/SaveSourceNode";

const nodeTypes = {
  save: SaveSourceNode,
  source: DatasetSourceNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

function FluxFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, getNode, setNodes: updateNodes } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      
      const sourceNode = getNode(params.source);
      if (sourceNode?.data?.outputView) {
        updateNodes((nds) => 
          nds.map((node) => {
            if (node.id === params.target) {
              return {
                ...node,
                data: {
                  ...node.data,
                  sourceView: sourceNode.data.outputView,
                },
              };
            }
            return node;
          })
        );
      }
    },
    [setEdges, getNode, updateNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
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
        data: { label: `${type} node`, sourceView: "" }, // Initialize sourceView empty
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        proOptions={{hideAttribution: true}}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export function FluxCanvas() {
  return (
    <ReactFlowProvider>
      <FluxFlow />
    </ReactFlowProvider>
  );
}
