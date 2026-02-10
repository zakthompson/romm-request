import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bug, X, User as UserIcon, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { User } from '@/lib/auth';

const DEV_PERSONAS = [
  {
    label: 'User',
    icon: UserIcon,
    payload: {
      displayName: 'Dev User',
      email: 'user@localhost',
      isAdmin: false,
    },
  },
  {
    label: 'Admin',
    icon: Shield,
    payload: {
      displayName: 'Dev Admin',
      email: 'admin@localhost',
      isAdmin: true,
    },
  },
] as const;

export function DevAuthWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const loginAs = async (payload: (typeof DEV_PERSONAS)[number]['payload']) => {
    setLoading(true);
    try {
      const user = await apiFetch<User>('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      queryClient.setQueryData(['auth', 'me'], user);
    } catch (err) {
      console.error('Dev login failed:', err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {open ? (
        <div className="bg-card rounded-lg border p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs font-medium">
              Dev Login
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            {DEV_PERSONAS.map((persona) => (
              <button
                key={persona.label}
                disabled={loading}
                onClick={() => loginAs(persona.payload)}
                className="hover:bg-accent flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <persona.icon className="h-3.5 w-3.5" />
                {persona.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-card hover:bg-accent rounded-full border p-2 shadow-md transition-colors"
          title="Dev Auth"
        >
          <Bug className="text-muted-foreground h-4 w-4" />
        </button>
      )}
    </div>
  );
}
