import { Gamepad2 } from 'lucide-react';

interface GameSearchResult {
  id: number;
  name: string;
  coverUrl: string | null;
  firstReleaseDate: number | null;
  platforms: { id: number; name: string; abbreviation?: string }[];
}

function formatYear(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).getFullYear().toString();
}

export function GameResultCard({
  game,
  onClick,
}: {
  game: GameSearchResult;
  onClick: () => void;
}) {
  const year = formatYear(game.firstReleaseDate);

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer text-left focus:outline-none"
    >
      <div className="bg-muted aspect-[264/374] overflow-hidden rounded-lg">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gamepad2 className="text-muted-foreground h-12 w-12" />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{game.name}</p>
      {year && <p className="text-muted-foreground text-xs">{year}</p>}
    </button>
  );
}
