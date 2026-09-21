"use client";

import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  GitBranch,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { saveProcessGraph } from "@/app/actions/process-actions";
import {
  processFlowNodeTypes,
  type ProcessFlowData,
  type ProcessFlowNodeType,
} from "@/components/process-flow-node";
import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessGraph, ProcessNodeType } from "@/lib/domain/types";

const nodeWidth = 224;
const nodeHeight = 110;

function toFlowNodes(
  graph: ProcessGraph,
  relayout = false,
): ProcessFlowNodeType[] {
  let positions = new Map(
    graph.nodes.map((node) => [node.id, node.position] as const),
  );

  if (relayout) {
    const layout = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    layout.setGraph({
      rankdir:
        graph.direction === "TB" || graph.direction === "TD"
          ? "TB"
          : graph.direction,
      ranksep: 78,
      nodesep: 54,
      marginx: 30,
      marginy: 30,
    });
    graph.nodes.forEach((node) =>
      layout.setNode(node.id, { width: nodeWidth, height: nodeHeight }),
    );
    graph.edges.forEach((edge) => layout.setEdge(edge.source, edge.target));
    dagre.layout(layout);
    positions = new Map(
      graph.nodes.map((node) => {
        const point = layout.node(node.id);
        return [
          node.id,
          { x: point.x - nodeWidth / 2, y: point.y - nodeHeight / 2 },
        ] as const;
      }),
    );
  }

  return graph.nodes.map((node) => ({
    id: node.id,
    type: "processStep",
    position: positions.get(node.id) ?? node.position,
    data: {
      label: node.title,
      processType: node.type,
      actor: node.actor,
      timing: node.timing,
      why: node.why,
      evidence: node.evidence,
    },
  }));
}

function toFlowEdges(graph: ProcessGraph): Edge[] {
  return graph.edges.map((edge) => ({
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
}

export function ProcessBuilder({
  initialGraph,
}: {
  initialGraph: ProcessGraph;
}) {
  const params = useParams<{ processId: string; versionId: string }>();
  const { localPrefix } = useTenantTheme();
  const graphStorageKey = `emilda:graph:${params.processId}:${params.versionId}`;
  const starterGraphKey = `emilda:starter-graph:${params.processId}:${params.versionId}`;
  const [nodes, setNodes] = useState<ProcessFlowNodeType[]>(() =>
    toFlowNodes(initialGraph),
  );
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(initialGraph));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState("Saved just now");

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw =
          localStorage.getItem(graphStorageKey) ??
          (params.processId === "purchase-approval"
            ? localStorage.getItem("emilda:graph:purchase-v21")
            : null);
        const starter = localStorage.getItem(starterGraphKey);
        const imported =
          localStorage.getItem(
            `emilda:mermaid:${params.processId}:${params.versionId}`,
          ) ??
          (params.processId === "purchase-approval"
            ? localStorage.getItem("emilda:mermaid:purchase-v21")
            : null);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            nodes: ProcessFlowNodeType[];
            edges: Edge[];
          };
          setNodes(
            parsed.nodes.map((node) => ({
              ...node,
              type: "processStep",
              data: {
                ...node.data,
                label: String(node.data.label),
                processType:
                  (node.data.processType as ProcessNodeType | undefined) ??
                  "ACTION",
              },
            })),
          );
          setEdges(
            parsed.edges.map((edge) => ({
              ...edge,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#60717a",
              },
              style: { stroke: "#60717a", strokeWidth: 1.8 },
              labelStyle: {
                fill: "#34454d",
                fontWeight: 700,
                fontSize: 12,
              },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.96 },
            })),
          );
        } else if (starter || imported) {
          const graph = JSON.parse(starter ?? imported ?? "") as ProcessGraph;
          setNodes(toFlowNodes(graph, true));
          setEdges(toFlowEdges(graph));
        }
      } catch {
        localStorage.removeItem(graphStorageKey);
        localStorage.removeItem(starterGraphKey);
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [graphStorageKey, params.processId, params.versionId, starterGraphKey]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(graphStorageKey, JSON.stringify({ nodes, edges }));
      setLastSaved("Saved just now");
    }, 750);
    return () => window.clearTimeout(timer);
  }, [edges, graphStorageKey, hydrated, nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<ProcessFlowNodeType>[]) => {
      setLastSaved("Saving…");
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [],
  );
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setLastSaved("Saving…");
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);
  const onConnect = useCallback((connection: Connection) => {
    setLastSaved("Saving…");
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#60717a" },
          style: { stroke: "#60717a", strokeWidth: 1.8 },
        },
        current,
      ),
    );
  }, []);

  const graph = (): ProcessGraph => ({
    direction: "LR",
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.data.label,
      type: node.data.processType,
      actor: node.data.actor || undefined,
      timing: node.data.timing || undefined,
      why: node.data.why || undefined,
      evidence: node.data.evidence || undefined,
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label:
        typeof edge.label === "string" && edge.label ? edge.label : undefined,
    })),
  });

  const save = async () => {
    localStorage.setItem(graphStorageKey, JSON.stringify({ nodes, edges }));
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const result = await saveProcessGraph({
        processId: params.processId,
        versionId: params.versionId,
        graph: graph(),
      });
      if (!result.ok) return toast.error(result.error);
    }
    setLastSaved("Saved just now");
    toast.success("Process map saved");
  };

  const addStep = (processType: ProcessNodeType) => {
    const id = `step_${Date.now()}`;
    setNodes((current) => [
      ...current,
      {
        id,
        type: "processStep",
        position: { x: 620, y: 480 },
        data: {
          label: processType === "DECISION" ? "New decision" : "New action",
          processType,
          actor: "Assigned role",
        },
      },
    ]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  const removeSelected = () => {
    if (selectedNode) {
      const removedEdges = edges.filter(
        (edge) =>
          edge.source === selectedNode.id || edge.target === selectedNode.id,
      );
      setNodes((current) =>
        current.filter((node) => node.id !== selectedNode.id),
      );
      setEdges((current) =>
        current.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id,
        ),
      );
      toast("Step removed", {
        action: {
          label: "Undo",
          onClick: () => {
            setNodes((current) => [...current, selectedNode]);
            setEdges((current) => [...current, ...removedEdges]);
          },
        },
      });
      setSelectedNodeId(null);
    } else if (selectedEdge) {
      setEdges((current) =>
        current.filter((edge) => edge.id !== selectedEdge.id),
      );
      toast("Connection removed", {
        action: {
          label: "Undo",
          onClick: () => setEdges((current) => [...current, selectedEdge]),
        },
      });
      setSelectedEdgeId(null);
    }
  };

  const updateSelectedNode = (patch: Partial<ProcessFlowData>) => {
    if (!selectedNodeId) return;
    setLastSaved("Saving…");
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  };

  const move = (index: number, amount: -1 | 1) =>
    setNodes((current) => {
      const target = index + amount;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  return (
    <div>
      <section className="overflow-hidden rounded-xl border bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Editable process map</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {nodes.length} steps · {edges.length} connections · {lastSaved}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={() => addStep("ACTION")}>
              <Plus />
              Add action
            </Button>
            <Button variant="outline" onClick={() => addStep("DECISION")}>
              <GitBranch />
              Add decision
            </Button>
          </div>
        </div>

        <div
          className="hidden h-[620px] lg:block"
          aria-label="Editable process map"
        >
          <ReactFlow<ProcessFlowNodeType, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={processFlowNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 0.9 }}
            minZoom={0.35}
            maxZoom={1.35}
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "#60717a", strokeWidth: 1.8 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#d5dcdf" gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        </div>

        <div className="p-3 lg:hidden">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-900">
            Edit every step here. Use a larger screen only when you want to drag
            and reconnect the full map.
          </div>
          <div className="mt-3 space-y-2">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="flex min-h-14 items-center gap-1 rounded-lg border bg-white p-1.5"
              >
                <button
                  type="button"
                  aria-label={`${index + 1} ${node.data.label}`}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 text-left hover:bg-muted/50"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                >
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {node.data.label}
                    </span>
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      {node.data.processType.replaceAll("_", " ")}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${node.data.label} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${node.data.label} down`}
                  disabled={index === nodes.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(selectedNode || selectedEdge) && (
        <section className="mt-4 rounded-xl border bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">
                {selectedNode ? "Step details" : "Connection details"}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {selectedNode?.data.label ?? "Edit connection"}
              </h2>
            </div>
            <Button
              variant="ghost"
              className="text-destructive hover:bg-red-50 hover:text-destructive"
              onClick={removeSelected}
            >
              <Trash2 />
              Remove
            </Button>
          </div>

          {selectedNode && (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-2">
                <Label htmlFor="step-title">Selected step</Label>
                <Input
                  id="step-title"
                  value={selectedNode.data.label}
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateSelectedNode({ label: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="step-type">Step type</Label>
                <select
                  id="step-type"
                  value={selectedNode.data.processType}
                  onChange={(event) =>
                    updateSelectedNode({
                      processType: event.target.value as ProcessNodeType,
                    })
                  }
                  className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  {[
                    "START",
                    "ACTION",
                    "DECISION",
                    "HANDOFF",
                    "WAIT",
                    "DATA",
                    "SUBPROCESS",
                    "END",
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="step-actor">Who does it?</Label>
                <Input
                  id="step-actor"
                  value={selectedNode.data.actor ?? ""}
                  placeholder="Role or person"
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateSelectedNode({ actor: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="step-timing">When / SLA</Label>
                <Input
                  id="step-timing"
                  value={selectedNode.data.timing ?? ""}
                  placeholder="For example: within 4 hours"
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateSelectedNode({ timing: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="step-evidence">Evidence</Label>
                <Input
                  id="step-evidence"
                  value={selectedNode.data.evidence ?? ""}
                  placeholder="How completion is proved"
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateSelectedNode({ evidence: event.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Label htmlFor="step-why">Why does this step exist?</Label>
                <Textarea
                  id="step-why"
                  value={selectedNode.data.why ?? ""}
                  placeholder="Explain the reason so future teams keep the intent"
                  className="mt-2 min-h-20"
                  onChange={(event) =>
                    updateSelectedNode({ why: event.target.value })
                  }
                />
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="mt-5 max-w-md">
              <Label htmlFor="edge-label">Branch label</Label>
              <Input
                id="edge-label"
                value={
                  typeof selectedEdge.label === "string"
                    ? selectedEdge.label
                    : ""
                }
                placeholder="For example: Approved or Rejected"
                className="mt-2 h-11"
                onChange={(event) =>
                  setEdges((current) =>
                    current.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, label: event.target.value }
                        : edge,
                    ),
                  )
                }
              />
            </div>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-col-reverse gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 text-[var(--healthy)]" />
          Changes autosave on this device
        </div>
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
          <Button variant="outline" onClick={save}>
            <Save />
            Save map
          </Button>
          <Button asChild>
            <Link
              href={`${localPrefix}/processes/${params.processId}/versions/${params.versionId}/mermaid`}
            >
              Edit Mermaid
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
