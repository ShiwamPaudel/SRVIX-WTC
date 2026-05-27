import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32" />
        ))}
      </div>
    </div>
  );
}

function FilterSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-[#f5f7fc] p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24 bg-slate-100" />
          {Array.from({ length: fields }).map((_, index) => (
            <Skeleton key={index} className="h-12 min-w-36 flex-1 bg-slate-100" />
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24 bg-slate-100" />
          <Skeleton className="h-9 w-20 bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function TicketsPageSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <FilterSkeleton fields={7} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px_auto] lg:items-center">
              <div className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-64 max-w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-24 rounded-md" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((__, metaIndex) => (
                <Skeleton key={metaIndex} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MachinesPageSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={3} />
      <FilterSkeleton fields={3} />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-5">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section key={sectionIndex} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((__, cardIndex) => (
                <div
                  key={cardIndex}
                  className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-[168px_1fr]"
                >
                  <Skeleton className="aspect-[4/3] h-full rounded-none sm:aspect-auto" />
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-7 w-20" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AppPageSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={2} />
      <FilterSkeleton fields={4} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-3 h-20 w-full" />
            <Skeleton className="mt-4 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
