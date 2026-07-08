import { BriefingSection } from "@/components/dashboard/briefing-section";
import { CalendarSection } from "@/components/dashboard/calendar-section";
import { KnowledgeSection } from "@/components/dashboard/knowledge-section";
import { ProjectsSection } from "@/components/dashboard/projects-section";
import { StudySection } from "@/components/dashboard/study-section";

export default function DashboardPage() {
  return (
    <div className="min-h-full" style={{ backgroundColor: "#1A7DA4" }}>
      <header className="border-b border-primary/80">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-medium tracking-tight text-primary-foreground">
            My Pensieve
          </h1>
          <p className="mt-0.5 text-sm text-primary-foreground/85">
            Your morning dashboard
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <BriefingSection />
        <StudySection />
        <div className="grid gap-6 lg:grid-cols-2">
          <ProjectsSection />
          <KnowledgeSection />
        </div>
        <CalendarSection />
      </main>
    </div>
  );
}
