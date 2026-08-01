'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Building2,
  Store,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  MonitorPlay,
  Grid,
  ArrowUpRight,
  Database,
  Lock
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Badge } from '@/modules/core/components/ui/badge';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/v1/organizations')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTenants(data.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trinetra Operating System</h1>
          <p className="text-sm text-muted-foreground">
            Sprint 1A Core Infrastructure Shell • Active Tenant: <span className="font-semibold text-foreground">{user.organizationName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success" className="h-7 px-3 gap-1.5 text-xs font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Prisma & Supabase Live</span>
          </Badge>
          <Badge variant="outline" className="h-7 px-3 font-mono text-xs">
            Role: {user.role}
          </Badge>
        </div>
      </div>

      {/* ── ACTIVE TENANT CONTEXT CARDS ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organization (Level 1)</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{user.organizationName}</div>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.organizationId}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Restaurant (Level 2)</CardTitle>
            <Store className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{user.restaurantName}</div>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.restaurantId}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Branch Outlet (Level 3)</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{user.branchName}</div>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.branchId}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── RBAC PERMISSION EVALUATOR TEST BOARD ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Role-Based Access Control (RBAC) Permission Matrix Test</span>
          </CardTitle>
          <CardDescription>
            Evaluates fine-grained permission codes against active role <Badge variant="outline">{user.role}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { code: 'pos:order:create', label: 'Create Orders' },
              { code: 'pos:order:discount', label: 'Apply Discounts' },
              { code: 'pos:order:void', label: 'Void Bills' },
              { code: 'kds:ticket:update', label: 'Bump KDS Tickets' },
              { code: 'menu:manage', label: 'Manage Menu' },
              { code: 'inventory:adjust', label: 'Adjust Inventory' },
              { code: 'reports:financials', label: 'View Financials' },
              { code: 'settings:manage', label: 'Manage Settings' }
            ].map(perm => {
              const allowed = can(perm.code as any);
              return (
                <div
                  key={perm.code}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium ${
                    allowed
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                      : 'border-destructive/30 bg-destructive/5 text-muted-foreground opacity-60'
                  }`}
                >
                  <div className="truncate">
                    <p className="font-semibold">{perm.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{perm.code}</p>
                  </div>
                  {allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── PRISMA PERSISTED TENANTS DIRECTORY ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Persisted Organizations Directory (Prisma + PostgreSQL)</span>
          </CardTitle>
          <CardDescription>Live query results from `prisma.organization.findMany()`</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading database tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No organizations created yet. Click &quot;New Tenant&quot; in top header to create one!
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map(org => (
                <div key={org.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{org.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{org.id.slice(0, 8)}...</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {org.restaurants.map((rest: any) => (
                      <div key={rest.id} className="rounded border border-border/50 bg-muted/30 p-2">
                        <p className="font-semibold text-foreground">{rest.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rest.branches.length} Branch(es) configured</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODULE DIRECT LAUNCH PADS ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/pos">
          <Card className="hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">POS Billing</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">High-velocity keyboard cashier billing shell</p>
              <div className="mt-3 flex items-center text-xs font-semibold text-primary gap-1">
                <span>Launch Shell</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kds">
          <Card className="hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">KDS Display</CardTitle>
              <MonitorPlay className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Station-routed kitchen bump bar screen</p>
              <div className="mt-3 flex items-center text-xs font-semibold text-primary gap-1">
                <span>Launch Screen</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tables">
          <Card className="hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Floor Tables</CardTitle>
              <Grid className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Visual 2D floorplan grid and session states</p>
              <div className="mt-3 flex items-center text-xs font-semibold text-primary gap-1">
                <span>View Floorplan</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/security">
          <Card className="hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Security RBAC</CardTitle>
              <Lock className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Permissions matrix and tenant isolation policies</p>
              <div className="mt-3 flex items-center text-xs font-semibold text-primary gap-1">
                <span>Inspect Policies</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
