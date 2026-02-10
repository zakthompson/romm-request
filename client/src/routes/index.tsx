import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { APP_NAME } from '@romm-request/shared';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { apiPath } from '@/lib/api';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/search" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-3xl text-transparent">
            {APP_NAME}
          </CardTitle>
          <CardDescription>
            Request specific games be added to RomM!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <a href={apiPath('/api/auth/login')}>Sign In</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
