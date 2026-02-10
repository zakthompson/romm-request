import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { STATUS_CONFIG, STATUS_FILTERS } from '@/lib/request-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RequestDto, RequestStatus } from '@romm-request/shared';

export const Route = createFileRoute('/_authenticated/requests')({
  component: RequestsPage,
});

function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(
    'all'
  );

  const requestsQuery = useQuery({
    queryKey: ['requests', 'mine', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return apiFetch<RequestDto[]>(`/api/requests${params}`);
    },
    staleTime: 30 * 1000,
  });

  const requests = requestsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 lg:px-8">
      <h1 className="text-2xl font-bold">My Requests</h1>
      <p className="text-muted-foreground mt-1 mb-4">
        Track the status of your game requests.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Badge
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            className="cursor-pointer transition-colors"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      {requestsQuery.isLoading && <RequestListSkeleton />}

      {requestsQuery.isError && (
        <p className="text-destructive">
          Failed to load requests. Please try again.
        </p>
      )}

      {requestsQuery.isSuccess && requests.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
          <Gamepad2 className="mb-2 h-8 w-8" />
          <p>No requests found.</p>
          <p className="text-sm">
            Search for a game to submit your first request!
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: RequestDto }) {
  const config = STATUS_CONFIG[request.status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <div className="w-16 shrink-0">
          {request.gameCoverUrl ? (
            <img
              src={request.gameCoverUrl}
              alt={request.gameName}
              className="bg-muted aspect-[3/4] w-full rounded object-cover"
            />
          ) : (
            <div className="bg-muted flex aspect-[3/4] w-full items-center justify-center rounded">
              <Gamepad2 className="text-muted-foreground h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="leading-tight font-medium">{request.gameName}</h3>
              <p className="text-muted-foreground text-sm">
                {request.platformName}
              </p>
            </div>
            <Badge variant={config.variant} className="shrink-0">
              <StatusIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Requested {new Date(request.createdAt + 'Z').toLocaleDateString()}
          </p>
          {request.adminNotes && (
            <p className="bg-muted mt-2 rounded p-2 text-sm">
              {request.adminNotes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequestListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex gap-4 p-4">
            <Skeleton className="aspect-[3/4] w-16 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
