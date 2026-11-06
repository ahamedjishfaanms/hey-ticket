import EventForm from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl italic">New event</h1>
      <p className="mt-1 text-sm text-ink/60">
        Fill in the essentials — you can edit everything later, and publish
        when you&apos;re ready.
      </p>
      <EventForm mode="create" />
    </div>
  );
}
