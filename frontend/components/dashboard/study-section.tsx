"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudyTopicForm } from "@/components/dashboard/study-topic-form";
import { formatDisplayDate } from "@/lib/format-date";
import { extractErrorMessage } from "@/lib/extract-error-message";
import type { StudyTopic } from "@/lib/types";

const importanceBadgeVariant: Record<
  StudyTopic["importance"],
  "destructive" | "outline" | "ghost"
> = {
  high: "destructive",
  medium: "outline",
  low: "outline",
};

interface StudySectionProps {
  onBriefingMutated?: () => void;
}

export function StudySection({ onBriefingMutated }: StudySectionProps = {}) {
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [editing, setEditing] = useState<StudyTopic | "new" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/study/topics")
      .then((response) => response.json())
      .then((data: StudyTopic[]) => setTopics(data));
  }, []);

  function handleSaved(topic: StudyTopic) {
    setTopics((current) => {
      const exists = current.some((t) => t.id === topic.id);
      return exists
        ? current.map((t) => (t.id === topic.id ? topic : t))
        : [...current, topic];
    });
    setEditing(null);
    onBriefingMutated?.();
  }

  async function handleDelete(topic: StudyTopic) {
    if (!window.confirm(`Delete study topic "${topic.name}"? This can't be undone.`)) {
      return;
    }
    setDeleteError(null);
    try {
      const response = await fetch(`/study/topics/${topic.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setDeleteError(await extractErrorMessage(response));
        return;
      }
      setTopics((current) => current.filter((t) => t.id !== topic.id));
      onBriefingMutated?.();
    } catch {
      setDeleteError("Network error — could not reach the server.");
    }
  }

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Study
          </CardTitle>
          <CardDescription className="text-xs">
            Exam topics and progress
          </CardDescription>
        </div>
        <Dialog
          open={editing !== null}
          onOpenChange={(open) => setEditing(open ? "new" : null)}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing("new")}
          >
            <Plus data-icon="inline-start" />
            Add
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing && editing !== "new" ? "Edit study topic" : "Add study topic"}
              </DialogTitle>
            </DialogHeader>
            <StudyTopicForm
              topic={editing && editing !== "new" ? editing : undefined}
              onSaved={handleSaved}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {deleteError && (
          <p className="mb-3 text-sm text-destructive">{deleteError}</p>
        )}
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
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditing(topic)}
                    aria-label={`Edit ${topic.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void handleDelete(topic)}
                    aria-label={`Delete ${topic.name}`}
                  >
                    <Trash2 />
                  </Button>
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
