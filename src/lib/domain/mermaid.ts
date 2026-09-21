import type { ProcessGraph, ProcessNodeType } from "./types";

export interface MermaidDiagnostic {
  line: number;
  column: number;
  message: string;
}
export type MermaidParseResult =
  | { ok: true; graph: ProcessGraph }
  | { ok: false; diagnostics: MermaidDiagnostic[] };

const unsafe =
  /\b(click|style|classDef|linkStyle|subgraph|script)\b|<\/?[a-z][^>]*>|https?:\/\//i;
const header = /^\s*(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\s*$/i;
const edgeLine =
  /^\s*([A-Za-z_][\w-]*)\s*(?:\[\(([^)]+)\)\]|\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?\s*-->(?:\|([^|]+)\|)?\s*([A-Za-z_][\w-]*)\s*(?:\[\(([^)]+)\)\]|\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?\s*;?\s*$/;
const nodeLine =
  /^\s*([A-Za-z_][\w-]*)\s*(?:\[\(([^)]+)\)\]|\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})\s*;?\s*$/;

function nodeType(
  id: string,
  shape: "rect" | "round" | "decision" | "data",
  metadata?: ProcessNodeType,
): ProcessNodeType {
  if (metadata) return metadata;
  if (shape === "decision") return "DECISION";
  if (shape === "data") return "DATA";
  if (shape === "round" && /start/i.test(id)) return "START";
  if (shape === "round" && /end/i.test(id)) return "END";
  return "ACTION";
}

export function parseMermaid(source: string): MermaidParseResult {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const diagnostics: MermaidDiagnostic[] = [];
  if (!header.test(lines[0] ?? ""))
    diagnostics.push({
      line: 1,
      column: 1,
      message: "Start with flowchart TD, TB, LR, RL, or BT.",
    });
  const unsafeLine = lines.findIndex((line) => unsafe.test(line));
  if (unsafeLine >= 0)
    diagnostics.push({
      line: unsafeLine + 1,
      column: 1,
      message:
        "This construct is not supported because it can alter styling, load content, or hide logic.",
    });
  if (diagnostics.length) return { ok: false, diagnostics };

  const direction = header
    .exec(lines[0])?.[1]
    .toUpperCase() as ProcessGraph["direction"];
  const nodes = new Map<string, ProcessGraph["nodes"][number]>();
  const edges: ProcessGraph["edges"] = [];
  let pendingType: ProcessNodeType | undefined;
  const addNode = (
    id: string,
    groups: Array<string | undefined>,
    index: number,
    explicitType?: ProcessNodeType,
  ) => {
    const title = (groups.find(Boolean) ?? id).trim();
    const shape = groups[0]
      ? "data"
      : groups[3]
        ? "decision"
        : groups[2]
          ? "round"
          : "rect";
    if (!nodes.has(id))
      nodes.set(id, {
        id,
        title,
        type: nodeType(id, shape, explicitType),
        position: { x: (index % 3) * 260, y: Math.floor(index / 3) * 150 },
      });
  };
  lines.slice(1).forEach((line, offset) => {
    const clean = line.trim();
    if (!clean) return;
    const metadata =
      /^%%\s*emilda:type=(START|ACTION|DECISION|HANDOFF|WAIT|DATA|SUBPROCESS|END)\s*$/i.exec(
        clean,
      );
    if (metadata) {
      pendingType = metadata[1].toUpperCase() as ProcessNodeType;
      return;
    }
    if (clean.startsWith("%%")) return;
    const edge = edgeLine.exec(line);
    if (edge) {
      addNode(edge[1], edge.slice(2, 6), nodes.size, pendingType);
      addNode(edge[7], edge.slice(8, 12), nodes.size);
      pendingType = undefined;
      edges.push({
        id: `e${edges.length + 1}`,
        source: edge[1],
        target: edge[7],
        label: edge[6]?.trim(),
      });
      return;
    }
    const node = nodeLine.exec(line);
    if (node) {
      addNode(node[1], node.slice(2, 6), nodes.size, pendingType);
      pendingType = undefined;
      return;
    }
    diagnostics.push({
      line: offset + 2,
      column: Math.max(1, line.search(/\S/) + 1),
      message: "Use a supported node or directed edge (A --> B).",
    });
  });
  if (diagnostics.length) return { ok: false, diagnostics };
  if (nodes.size < 2)
    return {
      ok: false,
      diagnostics: [
        { line: 1, column: 1, message: "Add at least two connected nodes." },
      ],
    };
  return { ok: true, graph: { direction, nodes: [...nodes.values()], edges } };
}

function mermaidId(id: string): string {
  // Mermaid treats lowercase `end` as a flowchart keyword, even when it is a
  // valid Emilda node identifier. Keep exported diagrams renderable without
  // changing the structured graph stored in the database.
  return id.toLowerCase() === "end" ? `${id}_step` : id;
}

function shape(type: ProcessNodeType, id: string, title: string): string {
  let safe = title.replace(/[\[\]{}|]/g, "").replace(/"/g, "'");
  if (type === "DATA" && safe.startsWith("(") && safe.endsWith(")")) {
    safe = safe.slice(1, -1);
  }
  const outputId = mermaidId(id);
  if (type === "START" || type === "END") return `${outputId}(${safe})`;
  if (type === "DECISION") return `${outputId}{${safe}}`;
  // V1 uses a standard box for DATA in Mermaid. The Emilda metadata comment
  // preserves its semantic node type without relying on ambiguous shape syntax.
  if (type === "DATA") return `${outputId}[${safe}]`;
  return `${outputId}[${safe}]`;
}

export function exportMermaid(graph: ProcessGraph): string {
  const lines = [`flowchart ${graph.direction}`];
  graph.nodes.forEach((node) => {
    lines.push(`  %% emilda:type=${node.type}`);
    lines.push(`  ${shape(node.type, node.id, node.title)}`);
  });
  graph.edges.forEach((edge) =>
    lines.push(
      `  ${mermaidId(edge.source)} -->${edge.label ? `|${edge.label.replace(/\|/g, "/")}|` : ""} ${mermaidId(edge.target)}`,
    ),
  );
  return `${lines.join("\n")}\n`;
}

export function validateGraph(graph: ProcessGraph): string[] {
  const errors: string[] = [];
  const starts = graph.nodes.filter((node) => node.type === "START");
  const ends = graph.nodes.filter((node) => node.type === "END");
  if (starts.length !== 1)
    errors.push("The process needs exactly one Start step.");
  if (!ends.length) errors.push("The process needs at least one End step.");
  if (starts.length === 1 && ends.length) {
    const reachable = new Set([starts[0].id]);
    let changed = true;
    while (changed) {
      changed = false;
      graph.edges.forEach((edge) => {
        if (reachable.has(edge.source) && !reachable.has(edge.target)) {
          reachable.add(edge.target);
          changed = true;
        }
      });
    }
    if (!ends.some((node) => reachable.has(node.id)))
      errors.push("At least one End step must be reachable from Start.");
  }
  const connected = new Set(
    graph.edges.flatMap((edge) => [edge.source, edge.target]),
  );
  graph.nodes
    .filter((node) => !connected.has(node.id))
    .forEach((node) => errors.push(`${node.title} is disconnected.`));
  graph.nodes
    .filter((node) => node.type === "DECISION")
    .forEach((node) => {
      const exits = graph.edges.filter((edge) => edge.source === node.id);
      if (exits.length < 2)
        errors.push(`${node.title} needs at least two exits.`);
      const labels = exits
        .map((edge) => edge.label?.trim().toLowerCase())
        .filter(Boolean);
      if (new Set(labels).size !== labels.length)
        errors.push(`${node.title} has duplicate exit labels.`);
    });
  return errors;
}
