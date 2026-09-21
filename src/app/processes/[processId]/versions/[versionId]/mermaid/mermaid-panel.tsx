"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { exportMermaid, parseMermaid } from "@/lib/domain/mermaid";
import type { ProcessGraph } from "@/lib/domain/types";

export function MermaidPanel({ initialGraph }: { initialGraph: ProcessGraph }) {
  const params = useParams<{ processId: string; versionId: string }>();
  const { localPrefix } = useTenantTheme();
  const renderId = useId().replaceAll(":", "");
  const [source, setSource] = useState(() => exportMermaid(initialGraph));
  const [svg, setSvg] = useState("");
  const [renderError, setRenderError] = useState("");
  const [savedLabel, setSavedLabel] = useState("Saved just now");
  const result = useMemo(() => parseMermaid(source), [source]);
  const sourceStorageKey = `emilda:mermaid:source:${params.processId}:${params.versionId}`;
  const graphStorageKey = `emilda:mermaid:${params.processId}:${params.versionId}`;
  const builderStorageKey = `emilda:graph:${params.processId}:${params.versionId}`;
  const starterGraphKey = `emilda:starter-graph:${params.processId}:${params.versionId}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved =
        window.localStorage.getItem(sourceStorageKey) ??
        (params.processId === "purchase-approval"
          ? window.localStorage.getItem("emilda:mermaid:source:purchase-v21")
          : null);
      const starter = window.localStorage.getItem(starterGraphKey);
      if (saved) setSource(saved);
      else if (starter) {
        try {
          setSource(exportMermaid(JSON.parse(starter)));
        } catch {
          window.localStorage.removeItem(starterGraphKey);
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [params.processId, sourceStorageKey, starterGraphKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(sourceStorageKey, source);
      setSavedLabel("Saved just now");
    }, 750);
    return () => window.clearTimeout(timer);
  }, [source, sourceStorageKey]);

  useEffect(() => {
    let cancelled = false;
    if (!result.ok) {
      return;
    }
    const render = async () => {
      try {
        const [{ default: mermaid }, { default: DOMPurify }] =
          await Promise.all([
            import("mermaid"),
            import("isomorphic-dompurify"),
          ]);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#ffffff",
            primaryTextColor: "#172126",
            primaryBorderColor: "#9aa8ae",
            lineColor: "#60717a",
            secondaryColor: "#ecf6f3",
            tertiaryColor: "#fff7df",
            edgeLabelBackground: "#ffffff",
            fontSize: "15px",
          },
          flowchart: { curve: "basis", htmlLabels: false, nodeSpacing: 38 },
        });
        const rendered = await mermaid.render(
          `emilda-mermaid-${renderId}`,
          exportMermaid(result.graph),
        );
        const clean = DOMPurify.sanitize(rendered.svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
        });
        if (!cancelled) {
          setSvg(clean);
          setRenderError("");
        }
      } catch {
        if (!cancelled) {
          setSvg("");
          setRenderError(
            "The diagram preview could not render. Check the highlighted syntax before applying it.",
          );
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [renderId, result, source]);

  const download = () => {
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${params.processId}-${params.versionId}.mmd`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Mermaid file downloaded");
  };

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="overflow-hidden rounded-xl border bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Mermaid source</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {savedLabel}
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
              .mmd
            </span>
          </div>
          <Textarea
            value={source}
            onChange={(event) => {
              setSavedLabel("Saving…");
              setSource(event.target.value);
            }}
            aria-label="Mermaid source"
            spellCheck={false}
            className="min-h-[500px] resize-none rounded-none border-0 bg-[#14252d] p-5 font-mono text-[13px] leading-6 text-slate-100 shadow-none focus-visible:ring-0"
          />
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Live diagram</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Preview only · applying is a separate action
              </p>
            </div>
            {result.ok ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="size-3.5" />
                Valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                <AlertTriangle className="size-3.5" />
                Needs a fix
              </span>
            )}
          </div>

          <div className="flex min-h-[500px] items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,#eef2f3_1px,transparent_1px)] bg-[size:22px_22px] p-5">
            {result.ok && svg ? (
              <div
                aria-label="Mermaid diagram preview"
                className="w-full min-w-[560px] [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[470px] [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : result.ok ? (
              <p className="text-sm text-muted-foreground">
                Rendering diagram…
              </p>
            ) : (
              <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      We could not preview this yet
                    </p>
                    {result.diagnostics.map((item) => (
                      <p
                        key={`${item.line}-${item.column}-${item.message}`}
                        className="mt-1.5 text-sm leading-5"
                      >
                        Line {item.line}, column {item.column}: {item.message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {result.ok && renderError && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {renderError}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {result.ok ? (
            <p className="text-sm font-medium text-emerald-800">
              {result.graph.nodes.length} steps and {result.graph.edges.length}{" "}
              connections are ready.
            </p>
          ) : (
            <p className="text-sm font-medium text-red-800">
              Fix the syntax above before applying this map.
            </p>
          )}
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Supported: flowcharts, labels, decisions, branches, and loops.
            Styling, scripts, subgraphs, and links are rejected safely.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(source);
              toast.success("Mermaid copied");
            }}
          >
            <Clipboard />
            Copy
          </Button>
          <Button variant="outline" onClick={download}>
            <Download />
            Download
          </Button>
          <Button
            asChild={result.ok}
            disabled={!result.ok}
            className="col-span-2"
          >
            {result.ok ? (
              <Link
                href={`${localPrefix}/processes/${params.processId}/versions/${params.versionId}/builder`}
                onClick={() => {
                  localStorage.setItem(
                    graphStorageKey,
                    JSON.stringify(result.graph),
                  );
                  localStorage.removeItem(builderStorageKey);
                  toast.success("Mermaid applied to the draft map");
                }}
              >
                Apply to draft map
                <ArrowRight />
              </Link>
            ) : (
              "Fix errors to apply"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
