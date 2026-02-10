import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { DevAuthWidget } from '@/components/dev-auth-widget';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ErrorBoundary>
      <div className="dark bg-background text-foreground min-h-screen">
        <Outlet />
        {import.meta.env.DEV && <DevAuthWidget />}
      </div>
    </ErrorBoundary>
  );
}
