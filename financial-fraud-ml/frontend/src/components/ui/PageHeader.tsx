import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-secondary">{description}</p>
      </div>
      {actions}
    </div>
  );
}
