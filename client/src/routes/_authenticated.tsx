import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { NavBar } from '@/components/nav-bar';

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
