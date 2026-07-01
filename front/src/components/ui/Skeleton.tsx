export function ProfileSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Candidate header skeleton */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-3.5 w-64 rounded" />
            <div className="skeleton h-3 w-48 rounded" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-6 w-12 rounded" />
            <div className="skeleton h-1 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* FieldCards skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="skeleton h-2.5 w-20 rounded" />
            <div className="skeleton h-4 w-14 rounded-full" />
          </div>
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-1 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkillsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-5 w-16 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="skeleton h-3 rounded flex-1" style={{ width: `${60 + (i * 11) % 40}%` }} />
            <div className="skeleton h-4 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperienceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="skeleton w-2.5 h-2.5 rounded-full mt-1.5" />
            {i < 2 && <div className="skeleton w-px h-10 mt-1" />}
          </div>
          <div className="space-y-1.5 flex-1 pb-4">
            <div className="skeleton h-3.5 w-48 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2.5 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EducationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-2 flex-shrink-0" />
          <div className="space-y-1.5 flex-grow">
            <div className="skeleton h-3.5 w-48 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2.5 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

