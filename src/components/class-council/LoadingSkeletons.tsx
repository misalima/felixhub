import type { ComponentProps } from "react";
import { Skeleton as BaseSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ComponentProps<typeof BaseSkeleton>) {
  return <BaseSkeleton className={cn("council-skeleton animate-none", className)} {...props} />;
}

function LoadingStatus({ label }: { label: string }) {
  return <span className="sr-only" role="status" aria-live="polite">{label}</span>;
}

export function CouncilOverviewSkeleton() {
  return <main className="mx-auto max-w-7xl p-4 py-8 sm:p-8" aria-busy="true">
    <LoadingStatus label="Carregando conselho" />
    <Skeleton className="mb-5 h-9 w-40" />
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-3"><div className="flex items-center gap-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-6 w-24 rounded-full" /></div><Skeleton className="h-4 w-52" /></div>
      <div className="flex gap-2"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-40" /></div>
    </div>
    <div className="mb-6 rounded-2xl border p-5"><div className="flex gap-3"><Skeleton className="h-5 w-5 shrink-0 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full max-w-4xl" /><Skeleton className="h-4 w-3/4 max-w-3xl" /></div></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="rounded-2xl border p-4"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="mt-4 h-8 w-16" /><Skeleton className="mt-2 h-3 w-24" /><Skeleton className="mt-3 h-3 w-16" /></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border p-5"><div className="mb-5 flex justify-between"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-24" /></div><div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center justify-between rounded-xl border p-4"><div className="space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-6 w-24 rounded-full" /></div>)}</div></section>
      <section className="rounded-2xl border p-5"><Skeleton className="h-5 w-64" /><div className="mt-5 space-y-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="space-y-2"><div className="flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-2 w-full rounded-full" /></div>)}</div></section>
    </div>
  </main>;
}

export function CouncilListSkeleton() {
  return <main className="mx-auto max-w-6xl p-4 py-8 sm:p-8" aria-busy="true">
    <LoadingStatus label="Carregando lista de conselhos" />
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-10 w-36" /></div>
    <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl border p-5"><div className="flex items-start justify-between gap-3"><div className="space-y-3"><Skeleton className="h-5 w-44" /><Skeleton className="h-4 w-32" /></div><Skeleton className="h-6 w-24 rounded-full" /></div><div className="mt-6"><div className="mb-2 flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-10" /></div><Skeleton className="h-2 w-full rounded-full" />{index % 3 === 0 && <Skeleton className="mt-4 h-3 w-48" />}</div></div>)}</div>
  </main>;
}

export function ClassWorkspaceSkeleton() {
  return <main className="mx-auto max-w-7xl p-4 py-6 sm:p-6" aria-busy="true">
    <LoadingStatus label="Carregando workspace da turma" />
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="space-y-3"><Skeleton className="h-9 w-40" /><div className="flex items-center gap-3"><Skeleton className="h-8 w-44" /><Skeleton className="h-6 w-24 rounded-full" /></div><Skeleton className="h-4 w-56" /></div><Skeleton className="h-10 w-36" /></div>
    <div className="mx-auto mb-5 grid w-full max-w-5xl grid-cols-2 gap-2 rounded-2xl border p-2 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div>
    <div className="grid min-h-[680px] overflow-hidden rounded-2xl border lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="border-b lg:border-b-0 lg:border-r"><div className="grid gap-2 border-b p-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div><div className="space-y-2 p-2">{Array.from({ length: 9 }, (_, index) => <div key={index} className="flex items-center justify-between rounded-xl p-3"><Skeleton className={`h-4 ${index % 3 === 0 ? "w-52" : "w-44"}`} />{index % 2 === 0 && <Skeleton className="h-7 w-7 rounded-full" />}</div>)}</div></aside>
      <article className="min-w-0 p-4 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div className="space-y-2"><Skeleton className="h-7 w-72 max-w-full" /><Skeleton className="h-4 w-64 max-w-full" /></div><div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-9" /><Skeleton className="h-9 w-9" /></div></div><Skeleton className="mb-5 h-28 w-full rounded-xl" /><div className="mb-5 overflow-hidden rounded-xl border"><Skeleton className="h-11 w-full rounded-none" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-[1.5fr_repeat(3,1fr)] gap-4 border-t p-3"><Skeleton className="h-4 w-32" /><Skeleton className="mx-auto h-4 w-10" /><Skeleton className="mx-auto h-4 w-10" /><Skeleton className="mx-auto h-4 w-10" /></div>)}</div><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-24 w-full sm:col-span-2" /><Skeleton className="h-24 w-full sm:col-span-2" /></div></article>
    </div>
  </main>;
}
