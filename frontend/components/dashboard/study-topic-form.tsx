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
import type { StudyTopic } from "@/lib/types";

interface StudyTopicFormValues {
  name: string;
  examName: string;
  domain: string;
  status: StudyTopic["status"];
  deadline: string;
  notes: string;
  importance: StudyTopic["importance"];
  estimatedDurationMinutes: string;
}

function toFormValues(topic?: StudyTopic): StudyTopicFormValues {
  return {
    name: topic?.name ?? "",
    examName: topic?.examName ?? "",
    domain: topic?.domain ?? "",
    status: topic?.status ?? "not_started",
    deadline: topic?.deadline ?? "",
    notes: topic?.notes ?? "",
    importance: topic?.importance ?? "medium",
    estimatedDurationMinutes:
      topic?.estimatedDurationMinutes != null
        ? String(topic.estimatedDurationMinutes)
        : "",
  };
}

interface StudyTopicFormProps {
  topic?: StudyTopic;
  onSaved: (topic: StudyTopic) => void;
}

export function StudyTopicForm({ topic, onSaved }: StudyTopicFormProps) {
  const [values, setValues] = useState<StudyTopicFormValues>(() =>
    toFormValues(topic)
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "examName", string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!values.name.trim()) errors.name = "Name is required.";
    if (!values.examName.trim())
      errors.examName = "Module / Subject is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const body = {
      name: values.name.trim(),
      examName: values.examName.trim(),
      domain: values.domain.trim() || "",
      status: values.status,
      deadline: values.deadline || null,
      notes: values.notes.trim(),
      importance: values.importance,
      estimatedDurationMinutes: values.estimatedDurationMinutes
        ? Number(values.estimatedDurationMinutes)
        : undefined,
    };

    setSubmitting(true);
    try {
      const response = await fetch(
        topic ? `/study/topics/${topic.id}` : "/study/topics",
        {
          method: topic ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        setSubmitError(await extractErrorMessage(response));
        return;
      }
      const saved: StudyTopic = await response.json();
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
        <Label htmlFor="study-name">Name</Label>
        <Input
          id="study-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="study-exam-name">Module / Subject</Label>
        <Input
          id="study-exam-name"
          placeholder="e.g., Cyber Security Fundamentals"
          value={values.examName}
          onChange={(e) =>
            setValues((v) => ({ ...v, examName: e.target.value }))
          }
          aria-invalid={!!fieldErrors.examName}
        />
        {fieldErrors.examName && (
          <p className="text-xs text-destructive">{fieldErrors.examName}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="study-domain">Topic / Section (Optional)</Label>
        <Input
          id="study-domain"
          placeholder="e.g., Assignment 1, Chapter 3, or Lab 2"
          value={values.domain}
          onChange={(e) =>
            setValues((v) => ({ ...v, domain: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="study-status">Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) =>
              setValues((v) => ({
                ...v,
                status: value as StudyTopic["status"],
              }))
            }
          >
            <SelectTrigger id="study-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not started</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="study-importance">Importance</Label>
          <Select
            value={values.importance}
            onValueChange={(value) =>
              setValues((v) => ({
                ...v,
                importance: value as StudyTopic["importance"],
              }))
            }
          >
            <SelectTrigger id="study-importance" className="w-full">
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
          <Label htmlFor="study-deadline">Deadline</Label>
          <Input
            id="study-deadline"
            type="date"
            value={values.deadline}
            onChange={(e) =>
              setValues((v) => ({ ...v, deadline: e.target.value }))
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="study-duration">Est. duration (min)</Label>
          <Input
            id="study-duration"
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
        <Label htmlFor="study-notes">Notes</Label>
        <Textarea
          id="study-notes"
          value={values.notes}
          onChange={(e) =>
            setValues((v) => ({ ...v, notes: e.target.value }))
          }
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : topic ? "Save changes" : "Add topic"}
        </Button>
      </DialogFooter>
    </form>
  );
}
