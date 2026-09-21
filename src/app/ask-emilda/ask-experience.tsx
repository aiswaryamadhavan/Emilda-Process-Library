"use client";
import Link from "next/link";
import { ArrowRight, Bot, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AiCitation } from "@/lib/domain/types";
export function AskExperience() {
  const [question, setQuestion] = useState("What is currently not working?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<AiCitation[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/ask-emilda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    setAnswer(data.answer ?? data.error);
    setCitations(data.citations ?? []);
    setConfigured(data.configured ?? true);
    setLoading(false);
  };
  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="h-14 rounded-2xl bg-white"
          aria-label="Question for Ask Emilda"
        />
        <Button
          type="submit"
          size="icon"
          className="size-14 shrink-0 rounded-2xl"
          disabled={loading || question.trim().length < 3}
          aria-label="Ask"
        >
          <Send />
        </Button>
      </form>
      {answer && (
        <Card className="mt-5 shadow-none">
          <CardContent className="p-5 sm:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)]">
              <Bot className="size-5" />
              Ask Emilda
            </div>
            <p className="mt-4 text-lg leading-8">{answer}</p>
            {citations.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="eyebrow">Sources</p>
                <div className="mt-2 space-y-2">
                  {citations.map((citation) => (
                    <Link
                      key={citation.searchDocumentId}
                      href={citation.href}
                      className="flex min-h-11 items-center justify-between rounded-xl bg-muted px-3 text-sm font-medium"
                    >
                      {citation.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!configured && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                AI is not configured, so this answer uses permission-aware
                search directly. Set OPENAI_API_KEY and OPENAI_MODEL to enable
                generated summaries.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          "Which processes are red?",
          "What changed in purchasing?",
          "Which audit is overdue?",
        ].map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            className="min-h-11 rounded-full bg-white"
            onClick={() => setQuestion(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
