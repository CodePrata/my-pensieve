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
import { ProjectForm } from "@/components/dashboard/project-form";
import { formatDisplayDate } from "@/lib/format-date";
import { extractErrorMessage } from "@/lib/extract-error-message";
import type { Project } from "@/lib/types";

const importanceBadgeVariant: Record<
  Project["importance"],
  "destructive" | "outline" | "ghost"
> = {
  high: "destructive",
  medium: "outline",
  low: "outline",
};

interface ProjectsSectionProps {
  onBriefingMutated?: () => void;
}

export function ProjectsSection({
  onBriefingMutated,
}: ProjectsSectionProps = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/projects")
      .then((response) => response.json())
      .then((data: Project[]) => setProjects(data));
  }, []);

  function handleSaved(project: Project) {
    setProjects((current) => {
      const exists = current.some((p) => p.id === project.id);
      return exists
        ? current.map((p) => (p.id === project.id ? project : p))
        : [...current, project];
    });
    setEditing(null);
    onBriefingMutated?.();
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? This can't be undone.`)) {
      return;
    }
    setDeleteError(null);
    try {
      const response = await fetch(`/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setDeleteError(await extractErrorMessage(response));
        return;
      }
      setProjects((current) => current.filter((p) => p.id !== project.id));
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
            Projects
          </CardTitle>
          <CardDescription className="text-xs">
            Active and paused work
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
                {editing && editing !== "new" ? "Edit project" : "Add project"}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm
              project={editing && editing !== "new" ? editing : undefined}
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
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-lg border border-border/80 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{project.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={importanceBadgeVariant[project.importance]}>
                    {project.importance}
                  </Badge>
                  <Badge variant="outline">{project.status}</Badge>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditing(project)}
                    aria-label={`Edit ${project.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void handleDelete(project)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.description}
                {project.dueDate ? ` · due ${formatDisplayDate(project.dueDate)}` : ""}
                {project.estimatedDurationMinutes !== null
                  ? ` · ~${project.estimatedDurationMinutes} min`
                  : ""}
              </p>
              <a
                href={project.repoUrl}
                className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.repoUrl}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
