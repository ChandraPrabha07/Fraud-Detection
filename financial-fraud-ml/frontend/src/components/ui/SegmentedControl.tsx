interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line-strong bg-page p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              active ? "bg-surface-hover text-ink" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
