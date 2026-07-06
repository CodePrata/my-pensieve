"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BriefingSnapshot } from "@/lib/types";

const briefingCardClassName =
  "rounded-xl border border-accent-peach/30 bg-briefing-surface shadow-none ring-0 [--card-spacing:--spacing(6)]";

export function BriefingSection() {
  const [briefing, setBriefing] = useState<BriefingSnapshot | null>(null);

  useEffect(() => {
    void fetch("/briefing")
      .then((response) => response.json())
      .then((data: BriefingSnapshot) => setBriefing(data));
  }, []);

  if (!briefing) {
    return (
      <Card className={briefingCardClassName}>
        <CardHeader>
          <CardTitle className="font-serif text-2xl font-medium text-accent-peach">
            Briefing
          </CardTitle>
          <CardDescription className="font-sans text-sm">
            Today&apos;s priorities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-serif text-lg text-muted-foreground">
            Loading briefing…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={briefingCardClassName}>
      <CardHeader className="gap-2 pb-2">
        <CardTitle className="font-serif text-3xl font-medium leading-tight text-accent-peach">
          Briefing
        </CardTitle>
        <CardDescription className="font-sans text-sm">
          {briefing.date} · generated{" "}
          {new Date(briefing.generatedAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <p className="font-serif text-xl leading-relaxed text-foreground">
          {briefing.narration}
        </p>
        <ol className="list-inside list-decimal space-y-2 font-sans text-sm text-foreground/90">
          {briefing.priorities.map((priority) => (
            <li key={`${priority.priorityType}-${priority.referenceId}`}>
              <span className="font-medium">{priority.label}</span>{" "}
              <span className="text-muted-foreground">
                ({priority.priorityType.replace("_", " ")})
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
