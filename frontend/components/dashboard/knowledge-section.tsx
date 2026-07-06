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
import type { RawItem } from "@/lib/types";

export function KnowledgeSection() {
  const [items, setItems] = useState<RawItem[]>([]);

  useEffect(() => {
    void fetch("/knowledge/inbox")
      .then((response) => response.json())
      .then((data: RawItem[]) => setItems(data));
  }, []);

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Knowledge Inbox
        </CardTitle>
        <CardDescription className="text-xs">
          Captured items awaiting processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border/80 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.rawFilePath}</p>
                <Badge variant="outline">{item.sourceType}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Captured {new Date(item.capturedAt).toLocaleString()} via{" "}
                {item.captureMethod.replace("_", " ")}
                {item.processed ? " · processed" : " · pending"}
              </p>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.sourceUrl}
                </a>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
