import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/search')({
  component: SearchPage,
});

function SearchPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Search Games</h1>
      <p className="mt-2 text-muted-foreground">
        Game search will be implemented in Phase 3.
      </p>
    </div>
  );
}
