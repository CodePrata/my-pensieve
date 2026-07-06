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
import type { Project } from "@/lib/types";

export function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    void fetch("/projects")
      .then((response) => response.json())
      .then((data: Project[]) => setProjects(data));
  }, []);

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Projects
        </CardTitle>
        <CardDescription className="text-xs">
          Active and paused work
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-lg border border-border/80 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{project.name}</p>
                <Badge variant="outline">{project.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.description}
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
