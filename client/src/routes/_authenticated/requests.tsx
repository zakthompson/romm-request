import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/requests')({
  component: RequestsPage,
});

function RequestsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Requests</h1>
      <p className="text-muted-foreground mt-2">
        Request history will be implemented in Phase 4.
      </p>
    </div>
  );
}
