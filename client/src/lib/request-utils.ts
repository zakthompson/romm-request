import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { RequestStatus } from '@romm-request/shared';

export const STATUS_CONFIG: Record<
  RequestStatus,
  {
    label: string;
    icon: typeof Clock;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  pending: { label: 'Pending', icon: Clock, variant: 'secondary' },
  fulfilled: { label: 'Fulfilled', icon: CheckCircle2, variant: 'default' },
  rejected: { label: 'Rejected', icon: XCircle, variant: 'destructive' },
};

export const STATUS_FILTERS: Array<{
  value: RequestStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
];
