import { STATUS_BADGE_CLASS, STATUS_LABELS, type OrderStatus } from "@/lib/status";

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status as OrderStatus] ?? "badge-grey";
  const label = STATUS_LABELS[status as OrderStatus] ?? status;
  return <span className={`badge ${cls}`}>{label}</span>;
}
