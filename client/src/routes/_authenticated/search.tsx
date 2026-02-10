import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { GameResultCard } from '@/components/game-result-card';
import { GameDetailDialog } from '@/components/game-detail-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/search')({
  component: SearchPage,
});

interface GameSearchResult {
  id: number;
  name: string;
  coverUrl: string | null;
  firstReleaseDate: number | null;
  platforms: { id: number; name: string; abbreviation?: string }[];
}

function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const searchQuery = useQuery({
    queryKey: ['games', 'search', debouncedQuery],
    queryFn: () =>
      apiFetch<GameSearchResult[]>(
        `/api/games/search?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const results = searchQuery.data ?? [];
  const showResults = debouncedQuery.length >= 2;

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search Games</h1>
        <p className="text-muted-foreground mt-1">Find a game to request.</p>
      </div>

      <div className="relative mb-6">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search for a game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {showResults && searchQuery.isLoading && <SearchSkeleton />}

      {showResults && searchQuery.isError && (
        <p className="text-destructive">
          Failed to search games. Please try again.
        </p>
      )}

      {showResults && searchQuery.isSuccess && results.length === 0 && (
        <p className="text-muted-foreground">
          No games found for &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}

      {showResults && results.length > 0 && (
        <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {results.map((game) => (
            <GameResultCard
              key={game.id}
              game={game}
              onClick={() => setSelectedGameId(game.id)}
            />
          ))}
        </div>
      )}

      <GameDetailDialog
        gameId={selectedGameId}
        open={selectedGameId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedGameId(null);
        }}
      />
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[264/374] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
