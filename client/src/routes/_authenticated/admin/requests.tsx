import { useState } from 'react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_CONFIG, STATUS_FILTERS } from '@/lib/request-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { RequestDto, RequestStatus } from '@romm-request/shared';

export const Route = createFileRoute('/_authenticated/admin/requests')({
  component: AdminRequestsPage,
});

function AdminRequestsPage() {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(
    'pending'
  );
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(
    null
  );

  if (!isAdmin) {
    return <Navigate to="/search" />;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">All Requests</h1>
      <p className="text-muted-foreground mt-1 mb-4">
        Manage game requests from all users.
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

      <AdminRequestList
        statusFilter={statusFilter}
        onSelect={setSelectedRequest}
      />

      <AdminRequestDialog
        request={selectedRequest}
        open={selectedRequest !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      />
    </div>
  );
}

function AdminRequestList({
  statusFilter,
  onSelect,
}: {
  statusFilter: RequestStatus | 'all';
  onSelect: (request: RequestDto) => void;
}) {
  const requestsQuery = useQuery({
    queryKey: ['requests', 'admin', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return apiFetch<RequestDto[]>(`/api/requests${params}`);
    },
    staleTime: 15 * 1000,
  });

  const requests = requestsQuery.data ?? [];

  if (requestsQuery.isLoading) {
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

  if (requestsQuery.isError) {
    return (
      <p className="text-destructive">
        Failed to load requests. Please try again.
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <Gamepad2 className="mb-2 h-8 w-8" />
        <p>No requests found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const config = STATUS_CONFIG[req.status];
        const StatusIcon = config.icon;

        return (
          <Card
            key={req.id}
            className="hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => onSelect(req)}
          >
            <CardContent className="flex gap-4 p-4">
              <div className="w-16 shrink-0">
                {req.gameCoverUrl ? (
                  <img
                    src={req.gameCoverUrl}
                    alt={req.gameName}
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
                    <h3 className="leading-tight font-medium">
                      {req.gameName}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {req.platformName}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="shrink-0">
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Requested by {req.user?.displayName ?? 'Unknown'} on{' '}
                  {new Date(req.createdAt + 'Z').toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AdminRequestDialog({
  request,
  open,
  onOpenChange,
}: {
  request: RequestDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: 'fulfilled' | 'rejected';
      notes?: string;
    }) =>
      apiFetch<RequestDto>(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNotes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      onOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAdminNotes('');
      updateMutation.reset();
    }
    onOpenChange(nextOpen);
  }

  if (!request) return null;

  const isPending = request.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.gameName}</DialogTitle>
          <DialogDescription>{request.platformName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-4">
            {request.gameCoverUrl && (
              <div className="w-20 shrink-0">
                <img
                  src={request.gameCoverUrl}
                  alt={request.gameName}
                  className="bg-muted aspect-[3/4] w-full rounded object-cover"
                />
              </div>
            )}
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Requested by:</span>{' '}
                {request.user?.displayName ?? 'Unknown'}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{' '}
                {request.user?.email ?? 'N/A'}
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span>{' '}
                {new Date(request.createdAt + 'Z').toLocaleString()}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                {STATUS_CONFIG[request.status].label}
              </p>
              {request.adminNotes && (
                <p>
                  <span className="text-muted-foreground">Admin notes:</span>{' '}
                  {request.adminNotes}
                </p>
              )}
            </div>
          </div>

          {isPending && (
            <>
              <Separator />
              <div>
                <label
                  htmlFor="admin-notes"
                  className="mb-1 block text-sm font-medium"
                >
                  Admin Notes (optional)
                </label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add a note for the requester..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {updateMutation.isError && (
                <p className="text-destructive text-sm">
                  {updateMutation.error instanceof ApiError
                    ? updateMutation.error.message
                    : 'Failed to update request. Please try again.'}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    updateMutation.mutate({
                      id: request.id,
                      status: 'fulfilled',
                      notes: adminNotes,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Fulfill
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() =>
                    updateMutation.mutate({
                      id: request.id,
                      status: 'rejected',
                      notes: adminNotes,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
