import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Server,
  Database,
  Shield,
  Gamepad2,
  Mail,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/admin/config')({
  component: AdminConfigPage,
});

interface AppConfig {
  app: {
    basePath: string;
    appUrl: string;
    environment: string;
    devAuth: boolean;
  };
  database: {
    path: string;
  };
  auth: {
    oidcIssuerUrl: string | null;
    adminGroup: string;
  };
  igdb: {
    configured: boolean;
  };
  email: {
    configured: boolean;
    smtpHost: string | null;
    fromAddress: string | null;
    adminEmail: string | null;
  };
}

function AdminConfigPage() {
  const { isAdmin } = useAuth();

  const configQuery = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => apiFetch<AppConfig>('/api/admin/config'),
    staleTime: 60 * 1000,
  });

  if (!isAdmin) {
    return <Navigate to="/search" />;
  }

  const cfg = configQuery.data;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Configuration</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Current server configuration (read-only).
      </p>

      {configQuery.isLoading && <ConfigSkeleton />}

      {configQuery.isError && (
        <p className="text-destructive">
          Failed to load configuration. Please try again.
        </p>
      )}

      {cfg && (
        <div className="space-y-4">
          <ConfigSection title="Application" icon={Server}>
            <ConfigItem label="Environment" value={cfg.app.environment} />
            <ConfigItem label="Base Path" value={cfg.app.basePath} />
            <ConfigItem label="App URL" value={cfg.app.appUrl} />
            <ConfigItem
              label="Dev Auth"
              value={cfg.app.devAuth ? 'Enabled' : 'Disabled'}
            />
          </ConfigSection>

          <ConfigSection title="Database" icon={Database}>
            <ConfigItem label="Path" value={cfg.database.path} />
          </ConfigSection>

          <ConfigSection title="Authentication" icon={Shield}>
            <ConfigItem
              label="OIDC Issuer"
              value={cfg.auth.oidcIssuerUrl}
              fallback="Not configured"
            />
            <ConfigItem label="Admin Group" value={cfg.auth.adminGroup} />
          </ConfigSection>

          <ConfigSection title="IGDB" icon={Gamepad2}>
            <ConfigStatus
              label="IGDB Integration"
              configured={cfg.igdb.configured}
            />
          </ConfigSection>

          <ConfigSection title="Email" icon={Mail}>
            <ConfigStatus label="SMTP" configured={cfg.email.configured} />
            {cfg.email.configured && (
              <>
                <ConfigItem
                  label="SMTP Host"
                  value={cfg.email.smtpHost}
                  fallback="N/A"
                />
                <ConfigItem
                  label="From Address"
                  value={cfg.email.fromAddress}
                  fallback="N/A"
                />
                <ConfigItem
                  label="Admin Email"
                  value={cfg.email.adminEmail}
                  fallback="N/A"
                />
              </>
            )}
          </ConfigSection>
        </div>
      )}
    </div>
  );
}

function ConfigSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Server;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function ConfigItem({
  label,
  value,
  fallback = 'N/A',
}: {
  label: string;
  value: string | null | undefined;
  fallback?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <code className="bg-muted max-w-[60%] truncate rounded px-2 py-0.5 text-xs">
        {value || fallback}
      </code>
    </div>
  );
}

function ConfigStatus({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={configured ? 'default' : 'secondary'}>
        {configured ? (
          <>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Configured
          </>
        ) : (
          <>
            <XCircle className="mr-1 h-3 w-3" />
            Not Configured
          </>
        )}
      </Badge>
    </div>
  );
}

function ConfigSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
