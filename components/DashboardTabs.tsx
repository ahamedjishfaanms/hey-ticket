import Link from "next/link";

export default function DashboardTabs({ active }: { active: "hosting" | "tickets" }) {
  return (
    <div className="mb-8 flex gap-6 border-b border-ink/10">
      <Link
        href="/dashboard"
        className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
          active === "hosting"
            ? "border-ink text-ink"
            : "border-transparent text-ink/40 hover:text-ink/70"
        }`}
      >
        Hosting
      </Link>
      <Link
        href="/dashboard/tickets"
        className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
          active === "tickets"
            ? "border-ink text-ink"
            : "border-transparent text-ink/40 hover:text-ink/70"
        }`}
      >
        My tickets
      </Link>
    </div>
  );
}
