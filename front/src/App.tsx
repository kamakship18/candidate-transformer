import { useState, type ReactNode } from 'react';
import { Header } from './components/layout/Header';
import { ActionBar } from './components/layout/ActionBar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { OutputDrawer } from './components/layout/OutputDrawer';

import { CSVUploader } from './components/sources/CSVUploader';
import { ATSJsonUploader } from './components/sources/ATSJsonUploader';
import { GitHubInput } from './components/sources/GitHubInput';
import { NotesUploader } from './components/sources/NotesUploader';
import { ResumeUploader } from './components/sources/ResumeUploader';

import { CandidateSelector } from './components/profile/CandidateSelector';
import { ProfileView } from './components/profile/ProfileView';
import { SkillsPanel } from './components/profile/SkillsPanel';
import { ExperienceTimeline } from './components/profile/ExperienceTimeline';
import { EducationHistory } from './components/profile/EducationHistory';
import { ProvenancePanel } from './components/profile/ProvenancePanel';
import {
  ProfileSkeleton,
  SkillsSkeleton,
  ExperienceSkeleton,
  EducationSkeleton,
} from './components/ui/Skeleton';

import { Button } from './components/ui/Button';
import { Card, CardHeader } from './components/ui/Card';
import { usePipelineStore } from './store/pipeline.store';

type ResultTab = 'profile' | 'skills' | 'experience' | 'education' | 'provenance';

function SourceGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">{label}</h3>
        <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SourceAccordion({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border/40 bg-surface-2/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-2/50 transition-colors"
      >
        <span className="text-xs font-medium text-text-secondary">{title}</span>
        <span className="flex items-center gap-2 text-text-muted">
          {count !== undefined && count > 0 && (
            <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {count}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/30">{children}</div>}
    </div>
  );
}

function SourcesPanel() {
  const sources = usePipelineStore((s) => s.sources);
  const gitHubRateLimitWarning = usePipelineStore((s) => s.gitHubRateLimitWarning);

  return (
    <Card elevated className="h-fit">
      <CardHeader title="Input sources" subtitle="Step 1 — add your files" className="mb-4" />

      <div className="space-y-5">
        <SourceGroup label="Structured" hint="Tabular exports & ATS payloads">
          <SourceAccordion title="CSV & ATS JSON" count={sources.csv.length + sources.ats_json.length}>
            <CSVUploader />
            <ATSJsonUploader />
          </SourceAccordion>
        </SourceGroup>

        <SourceGroup label="Documents" hint="Resumes, notes & GitHub">
          <SourceAccordion title="Resume & notes" count={sources.resume.length + sources.notes.length}>
            <ResumeUploader />
            <NotesUploader />
          </SourceAccordion>
          <SourceAccordion title="GitHub username" count={sources.github_username.trim() ? 1 : 0} defaultOpen={false}>
            <GitHubInput />
          </SourceAccordion>
        </SourceGroup>
      </div>

      {gitHubRateLimitWarning && (
        <p className="text-xs text-warning mt-4 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
          {gitHubRateLimitWarning}
        </p>
      )}
    </Card>
  );
}

function EmptyState() {
  const loadSamples = usePipelineStore((s) => s.loadSamples);

  return (
    <Card elevated className="flex flex-col items-center justify-center min-h-[320px] text-center border-dashed border-border/60">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-primary/80" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 4v16m8-8H4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">No results yet</h3>
      <p className="text-xs text-text-muted max-w-xs mb-4 leading-relaxed">
        Load sources on the left, then use Run pipeline in the bar above.
      </p>
      <Button variant="outline" size="sm" onClick={loadSamples}>
        Load sample files
      </Button>
    </Card>
  );
}

function ResultsPanel() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);
  const status = usePipelineStore((s) => s.status);
  const errors = usePipelineStore((s) => s.pipelineErrors);
  const [tab, setTab] = useState<ResultTab>('profile');

  const isRunning = status === 'running';
  const hasResult = canonical !== null;
  const showEmpty = status === 'idle' || (!hasResult && !isRunning);

  const tabs: { id: ResultTab; label: string; count?: number }[] = [
    { id: 'profile', label: 'Overview' },
    { id: 'skills', label: 'Skills', count: canonical?.skills.length },
    { id: 'experience', label: 'Experience', count: canonical?.experience.length },
    { id: 'education', label: 'Education', count: canonical?.education.length },
    { id: 'provenance', label: 'Provenance', count: canonical?.provenance.length },
  ];

  const fatalErrors = errors.filter(
    (error) => error.code !== 'NORMALIZATION_WARNING' && error.code !== 'RATE_LIMIT'
  );

  if (showEmpty) {
    return (
      <div>
        <CardHeader title="Results" subtitle="Step 2 — merged candidate profiles" className="mb-3" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <CardHeader title="Results" subtitle="Step 2 — merged candidate profiles" />

      {fatalErrors.length > 0 && (
        <div className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning">
          {fatalErrors.length} issue{fatalErrors.length !== 1 ? 's' : ''} — see Provenance tab
        </div>
      )}

      <CandidateSelector />

      <Card elevated noPad>
        <div className="flex gap-0.5 p-1.5 border-b border-border/40 bg-surface-2/20 overflow-x-auto scrollbar-thin">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                tab === item.id
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2/60',
              ].join(' ')}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] opacity-80 tabular-nums font-normal">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 min-h-[280px]">
          {tab === 'profile' && (isRunning ? <ProfileSkeleton /> : <ProfileView />)}
          {tab === 'skills' && (isRunning ? <SkillsSkeleton /> : <SkillsPanel />)}
          {tab === 'experience' && (isRunning ? <ExperienceSkeleton /> : <ExperienceTimeline />)}
          {tab === 'education' && (isRunning ? <EducationSkeleton /> : <EducationHistory />)}
          {tab === 'provenance' &&
            (isRunning ? (
              <div className="animate-pulse space-y-2">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="skeleton h-8 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <ProvenancePanel />
            ))}
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [outputOpen, setOutputOpen] = useState(false);

  return (
    <div className="min-h-screen text-text-primary relative">
      <div className="pointer-events-none fixed inset-0 bg-gradient-glow opacity-70" aria-hidden />
      <Header />
      <ActionBar onOpenOutput={() => setOutputOpen(true)} />

      <main className="relative max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-6 lg:gap-8 items-start">
          <ErrorBoundary>
            <SourcesPanel />
          </ErrorBoundary>
          <ErrorBoundary>
            <ResultsPanel />
          </ErrorBoundary>
        </div>
      </main>

      <OutputDrawer open={outputOpen} onClose={() => setOutputOpen(false)} />
    </div>
  );
}
