import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-blue-100 text-sky-700 shadow-[0_10px_24px_-16px_rgba(2,132,199,0.9)] dark:border-sky-900/70 dark:from-sky-950/80 dark:to-blue-950/80 dark:text-sky-300">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 pl-14 sm:pl-0">{actions}</div> : null}
    </div>
  );
}
