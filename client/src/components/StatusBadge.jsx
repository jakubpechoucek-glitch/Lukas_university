import { STATUS_META, marginText } from '../lib/format';

export default function StatusBadge({ result, compact = false }) {
  if (!result) return null;
  const meta = STATUS_META[result.status];
  const title = [meta.label, ...(result.reasons ?? [])].join('\n');
  if (compact) return <span title={title} className="cursor-help">{meta.icon}</span>;
  return (
    <span title={title} className={`inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.icon} {marginText(result.margin)}
    </span>
  );
}
