import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/requests')({
  component: RequestsPage,
});

function RequestsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Requests</h1>
      <p className="mt-2 text-muted-foreground">
        Request history will be implemented in Phase 4.
      </p>
    </div>
  );
}
