import { Link } from '@tanstack/react-router';
import { LogOut, Search, List, Shield, Settings } from 'lucide-react';
import { APP_NAME } from '@romm-request/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';

export function NavBar() {
  const { user, isAdmin, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b bg-card">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/search" className="text-lg font-semibold">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/search">
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/requests">
                <List className="mr-1.5 h-4 w-4" />
                My Requests
              </Link>
            </Button>
            {isAdmin && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/requests">
                    <Shield className="mr-1.5 h-4 w-4" />
                    All Requests
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/config">
                    <Settings className="mr-1.5 h-4 w-4" />
                    Config
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {user.displayName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled
              className="text-xs text-muted-foreground"
            >
              {user.email}
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                disabled
                className="text-xs text-muted-foreground"
              >
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
