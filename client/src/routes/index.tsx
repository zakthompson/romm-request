import { createFileRoute } from '@tanstack/react-router';
import { APP_NAME } from '@romm-request/shared';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{APP_NAME}</CardTitle>
          <CardDescription>
            Request games for your RomM collection
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button>Sign In</Button>
        </CardContent>
      </Card>
    </div>
  );
}
