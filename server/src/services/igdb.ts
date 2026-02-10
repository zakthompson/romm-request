import { config } from '../config.js';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const MAX_SEARCH_RESULTS = 20;
const GAME_DETAIL_FIELDS = [
  'name',
  'summary',
  'first_release_date',
  'cover.image_id',
  'platforms.id',
  'platforms.name',
  'platforms.abbreviation',
].join(',');

interface TwitchToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TwitchToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const params = new URLSearchParams({
    client_id: config.igdb.clientId,
    client_secret: config.igdb.clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Twitch token request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Refresh 60 seconds before expiry
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${IGDB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': config.igdb.clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`IGDB request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

export function buildCoverUrl(
  imageId: string,
  size: 'cover_small' | 'cover_big' | 'thumb' | '720p' = 'cover_big'
): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export interface IgdbGameSearchResult {
  id: number;
  name: string;
  coverUrl: string | null;
  firstReleaseDate: number | null;
  platforms: { id: number; name: string; abbreviation?: string }[];
}

interface IgdbRawGame {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  platforms?: { id: number; name: string; abbreviation?: string }[];
}

export async function searchGames(
  query: string
): Promise<IgdbGameSearchResult[]> {
  const sanitized = query.replace(/"/g, '\\"');
  const body = `search "${sanitized}"; fields ${GAME_DETAIL_FIELDS}; where version_parent = null; limit ${MAX_SEARCH_RESULTS};`;

  const results = await igdbFetch<IgdbRawGame[]>('/games', body);

  return results.map(mapGameToSearchResult);
}

export interface IgdbGameDetail {
  id: number;
  name: string;
  summary: string | null;
  coverUrl: string | null;
  firstReleaseDate: number | null;
  platforms: { id: number; name: string; abbreviation?: string }[];
}

export async function getGameDetails(
  id: number
): Promise<IgdbGameDetail | null> {
  const body = `fields ${GAME_DETAIL_FIELDS}; where id = ${id};`;

  const results = await igdbFetch<IgdbRawGame[]>('/games', body);

  if (results.length === 0) return null;

  const game = results[0];
  return {
    id: game.id,
    name: game.name,
    summary: game.summary ?? null,
    coverUrl: game.cover ? buildCoverUrl(game.cover.image_id) : null,
    firstReleaseDate: game.first_release_date ?? null,
    platforms: game.platforms ?? [],
  };
}

function mapGameToSearchResult(game: IgdbRawGame): IgdbGameSearchResult {
  return {
    id: game.id,
    name: game.name,
    coverUrl: game.cover ? buildCoverUrl(game.cover.image_id) : null,
    firstReleaseDate: game.first_release_date ?? null,
    platforms: game.platforms ?? [],
  };
}
