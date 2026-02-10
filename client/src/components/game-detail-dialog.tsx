import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, Check, Loader2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { CreateRequestBody, RequestDto } from '@romm-request/shared';

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
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(
    null
  );
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['games', 'detail', gameId],
    queryFn: () => apiFetch<GameDetail>(`/api/games/${gameId}`),
    enabled: gameId !== null,
    staleTime: 10 * 60 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: (body: CreateRequestBody) =>
      apiFetch<RequestDto>('/api/requests', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  const game = detailQuery.data;
  const selectedPlatform = game?.platforms.find(
    (p) => p.id === selectedPlatformId
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedPlatformId(null);
      submitMutation.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!game || !selectedPlatform) return;

    submitMutation.mutate({
      igdbGameId: game.id,
      gameName: game.name,
      gameCoverUrl: game.coverUrl,
      platformName: selectedPlatform.name,
      platformIgdbId: selectedPlatform.id,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
              <div className="w-32 shrink-0">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="bg-muted aspect-[3/4] w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-muted flex aspect-[3/4] w-full items-center justify-center rounded-lg">
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
                    {submitMutation.isSuccess
                      ? 'Requested Platform'
                      : 'Select a Platform to Request'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {game.platforms.map((platform) => (
                      <Badge
                        key={platform.id}
                        variant={
                          selectedPlatformId === platform.id
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          submitMutation.isSuccess
                            ? ''
                            : 'cursor-pointer transition-colors'
                        }
                        onClick={() => {
                          if (submitMutation.isSuccess) return;
                          setSelectedPlatformId(
                            selectedPlatformId === platform.id
                              ? null
                              : platform.id
                          );
                          submitMutation.reset();
                        }}
                      >
                        {platform.abbreviation ?? platform.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {submitMutation.isSuccess && (
              <div className="bg-muted flex items-center gap-2 rounded-lg p-3">
                <Check className="h-4 w-4 text-green-500" />
                <p className="text-sm">
                  Request submitted! You can track it on the{' '}
                  <a href="/requests" className="text-primary underline">
                    My Requests
                  </a>{' '}
                  page.
                </p>
              </div>
            )}

            {submitMutation.isError && (
              <p className="text-destructive text-sm">
                {submitMutation.error instanceof ApiError
                  ? submitMutation.error.message
                  : 'Failed to submit request. Please try again.'}
              </p>
            )}

            {selectedPlatformId && !submitMutation.isSuccess && (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="w-full"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Request ${game.name} for ${selectedPlatform?.abbreviation ?? selectedPlatform?.name}`
                )}
              </Button>
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
