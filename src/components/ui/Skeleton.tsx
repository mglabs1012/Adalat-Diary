function CaseCardSkeleton() {
  return (
    <div className="card flex gap-space-md p-space-base">
      <div className="skeleton h-14 w-12 shrink-0 rounded" />
      <div className="flex flex-1 flex-col gap-space-sm">
        <div className="skeleton h-3 w-24 rounded-full" />
        <div className="skeleton h-4 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-space-md xl:grid-cols-2"
      aria-busy="true"
      aria-label="Loading cases"
    >
      {Array.from({ length: rows }, (_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return <div className="skeleton h-[4.5rem] rounded-md lg:h-20" />;
}
