"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDisplayDate } from "@/lib/format-date";
import type { StudyTopic } from "@/lib/types";

const importanceBadgeVariant: Record<
  StudyTopic["importance"],
  "destructive" | "outline" | "ghost"
> = {
  high: "destructive",
  medium: "outline",
  low: "outline",
};

export function StudySection() {
  const [topics, setTopics] = useState<StudyTopic[]>([]);

  useEffect(() => {
    void fetch("/study/topics")
      .then((response) => response.json())
      .then((data: StudyTopic[]) => setTopics(data));
  }, []);

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Study
        </CardTitle>
        <CardDescription className="text-xs">
          Exam topics and progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className="rounded-lg border border-border/80 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{topic.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={importanceBadgeVariant[topic.importance]}>
                    {topic.importance}
                  </Badge>
                  <Badge variant="outline">{topic.status.replace("_", " ")}</Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {topic.examName} · domain {topic.domain}
                {topic.deadline ? ` · due ${formatDisplayDate(topic.deadline)}` : ""}
                {topic.estimatedDurationMinutes !== null
                  ? ` · ~${topic.estimatedDurationMinutes} min`
                  : ""}
              </p>
              {topic.notes && (
                <p className="mt-2 text-sm">{topic.notes}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
