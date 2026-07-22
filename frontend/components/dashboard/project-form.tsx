"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { isValidUrl } from "@/lib/is-valid-url";
import type { Project } from "@/lib/types";

interface ProjectFormValues {
  name: string;
  repoUrl: string;
  status: Project["status"];
  description: string;
  importance: Project["importance"];
  dueDate: string;
  estimatedDurationMinutes: string;
}

function toFormValues(project?: Project): ProjectFormValues {
  return {
    name: project?.name ?? "",
    repoUrl: project?.repoUrl ?? "",
    status: project?.status ?? "active",
    description: project?.description ?? "",
    importance: project?.importance ?? "medium",
    dueDate: project?.dueDate ?? "",
    estimatedDurationMinutes:
      project?.estimatedDurationMinutes != null
        ? String(project.estimatedDurationMinutes)
        : "",
  };
}

interface ProjectFormProps {
  project?: Project;
  onSaved: (project: Project) => void;
}

export function ProjectForm({ project, onSaved }: ProjectFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    toFormValues(project)
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "repoUrl", string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!values.name.trim()) errors.name = "Name is required.";
    if (!values.repoUrl.trim()) {
      errors.repoUrl = "Repo URL is required.";
    } else if (!isValidUrl(values.repoUrl.trim())) {
      errors.repoUrl = "Enter a well-formed URL (e.g. https://github.com/…).";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const body = {
      name: values.name.trim(),
      repoUrl: values.repoUrl.trim(),
      status: values.status,
      description: values.description.trim(),
      importance: values.importance,
      dueDate: values.dueDate || null,
      estimatedDurationMinutes: values.estimatedDurationMinutes
        ? Number(values.estimatedDurationMinutes)
        : undefined,
    };

    setSubmitting(true);
    try {
      const response = await fetch(
        project ? `/projects/${project.id}` : "/projects",
        {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        setSubmitError(await extractErrorMessage(response));
        return;
      }
      const saved: Project = await response.json();
      onSaved(saved);
    } catch {
      setSubmitError("Network error — could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="project-repo-url">Repo URL</Label>
        <Input
          id="project-repo-url"
          value={values.repoUrl}
          onChange={(e) =>
            setValues((v) => ({ ...v, repoUrl: e.target.value }))
          }
          aria-invalid={!!fieldErrors.repoUrl}
        />
        {fieldErrors.repoUrl && (
          <p className="text-xs text-destructive">{fieldErrors.repoUrl}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="project-status">Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) =>
              setValues((v) => ({
                ...v,
                status: value as Project["status"],
              }))
            }
          >
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="project-importance">Importance</Label>
          <Select
            value={values.importance}
            onValueChange={(value) =>
              setValues((v) => ({
                ...v,
                importance: value as Project["importance"],
              }))
            }
          >
            <SelectTrigger id="project-importance" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="project-due-date">Due date</Label>
          <Input
            id="project-due-date"
            type="date"
            value={values.dueDate}
            onChange={(e) =>
              setValues((v) => ({ ...v, dueDate: e.target.value }))
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="project-duration">Est. duration (min)</Label>
          <Input
            id="project-duration"
            type="number"
            min={0}
            value={values.estimatedDurationMinutes}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                estimatedDurationMinutes: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          value={values.description}
          onChange={(e) =>
            setValues((v) => ({ ...v, description: e.target.value }))
          }
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : project ? "Save changes" : "Add project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
