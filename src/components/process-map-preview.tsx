"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import { ArrowDown } from "lucide-react";

import {
  processFlowNodeTypes,
  type ProcessFlowNodeType,
} from "@/components/process-flow-node";
import type { ProcessGraph } from "@/lib/domain/types";

export function ProcessMapPreview({ graph }: { graph: ProcessGraph }) {
  const nodes: ProcessFlowNodeType[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "processStep",
    position: node.position,
    data: {
      label: node.title,
      processType: node.type,
      actor: node.actor,
      timing: node.timing,
      why: node.why,
      evidence: node.evidence,
    },
  }));
  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#60717a" },
    style: { stroke: "#60717a", strokeWidth: 1.8 },
    labelStyle: { fill: "#34454d", fontWeight: 700, fontSize: 12 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.96 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 6,
  }));

  return (
    <>
      <div
        className="hidden h-[500px] overflow-hidden rounded-xl border bg-white lg:block"
        aria-label="Process map preview"
      >
        <ReactFlow<ProcessFlowNodeType, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={processFlowNodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.08, maxZoom: 0.82 }}
          minZoom={0.4}
          maxZoom={1.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d5dcdf" gap={24} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>

      <ol className="space-y-2 lg:hidden" aria-label="Process steps">
        {graph.nodes.map((node, index) => (
          <li key={node.id}>
            <div
              className={`rounded-lg border p-3.5 ${
                node.type === "DECISION"
                  ? "border-amber-200 bg-amber-50"
                  : node.type === "START" || node.type === "END"
                    ? "border-emerald-200 bg-emerald-50"
                    : "bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold ring-1 ring-border">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {node.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{node.title}</p>
                  {(node.actor || node.timing) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {node.actor}
                      {node.actor && node.timing ? " · " : ""}
                      {node.timing}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {index < graph.nodes.length - 1 && (
              <ArrowDown className="mx-auto my-1 size-4 text-muted-foreground" />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
