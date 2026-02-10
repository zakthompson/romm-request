import { useQuery } from '@tanstack/react-query';
import { Gamepad2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface GameDetail {
  id: number;
  name: string;
  summary: string | null;
  coverUrl: string | null;
  firstReleaseDate: number | null;
  platforms: { id: number; name: string; abbreviation?: string }[];
}

function formatYear(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).getFullYear().toString();
}

export function GameDetailDialog({
  gameId,
  open,
  onOpenChange,
}: {
  gameId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ['games', 'detail', gameId],
    queryFn: () => apiFetch<GameDetail>(`/api/games/${gameId}`),
    enabled: gameId !== null,
    staleTime: 10 * 60 * 1000,
  });

  const game = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detailQuery.isLoading && <DetailSkeleton />}

        {detailQuery.isError && (
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Failed to load game details. Please try again.
            </DialogDescription>
          </DialogHeader>
        )}

        {game && (
          <>
            <DialogHeader>
              <DialogTitle>{game.name}</DialogTitle>
              {formatYear(game.firstReleaseDate) && (
                <DialogDescription>
                  {formatYear(game.firstReleaseDate)}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="flex gap-4">
              <div className="bg-muted aspect-[264/374] w-28 shrink-0 overflow-hidden rounded-lg">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Gamepad2 className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
              </div>

              {game.summary && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {game.summary}
                </p>
              )}
            </div>

            {game.platforms.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Available Platforms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {game.platforms.map((platform) => (
                      <Badge key={platform.id} variant="secondary">
                        {platform.abbreviation ?? platform.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4">
        <Skeleton className="aspect-[264/374] w-28 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
