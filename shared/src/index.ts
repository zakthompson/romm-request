export const APP_NAME = 'RomM Request' as const;

export type RequestStatus = 'pending' | 'fulfilled' | 'rejected';

export const REQUEST_STATUSES: RequestStatus[] = [
  'pending',
  'fulfilled',
  'rejected',
];

export interface CreateRequestBody {
  igdbGameId: number;
  gameName: string;
  gameCoverUrl: string | null;
  platformName: string;
  platformIgdbId: number;
}

export interface UpdateRequestBody {
  status: 'fulfilled' | 'rejected';
  adminNotes?: string;
}

export interface RequestDto {
  id: number;
  userId: number;
  igdbGameId: number;
  gameName: string;
  gameCoverUrl: string | null;
  platformName: string;
  platformIgdbId: number;
  status: RequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  user?: {
    displayName: string;
    email: string;
  };
}
