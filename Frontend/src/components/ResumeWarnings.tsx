export function ResumeWarnings({ warnings }: { warnings: string[] }) {
  // Also collapse warnings in drafts cached before the backend fix.
  const unique = [...new Set(warnings)];
  const removed = unique.filter((warning) => warning.startsWith("Removed unsupported extraction:"));
  const notes = unique.filter((warning) => !warning.startsWith("Removed unsupported extraction:"));
  if (removed.length) notes.unshift("Some items were omitted because supporting resume text could not be verified. Analyze again to refresh this draft.");
  if (!notes.length) return null;

  return <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
    <p>{notes[0]}</p>
    {notes.length > 1 && <details className="mt-2">
      <summary className="cursor-pointer">{notes.length - 1} more {notes.length === 2 ? "note" : "notes"}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">{notes.slice(1).map((note) => <li key={note}>{note}</li>)}</ul>
    </details>}
  </div>;
}
