import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/_authenticated/admin/requests')({
  component: AdminRequestsPage,
});

function AdminRequestsPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/search" />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">All Requests</h1>
      <p className="text-muted-foreground mt-2">
        Admin request management will be implemented in Phase 4.
      </p>
    </div>
  );
}
