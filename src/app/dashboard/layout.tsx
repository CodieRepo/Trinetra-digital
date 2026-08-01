'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  MonitorPlay,
  Grid,
  Package,
  Shield,
  FileBarChart,
  Command,
  LogOut,
  Building2,
  Store,
  MapPin,
  Plus,
  Utensils,
  Boxes,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { ThemeToggle } from '@/modules/core/components/theme-toggle';
import { CommandPalette } from '@/modules/core/components/command-palette';
import { ErrorBoundary } from '@/modules/core/components/error-boundary';
import { Badge } from '@/modules/core/components/ui/badge';
import { Button } from '@/modules/core/components/ui/button';
import { toast } from '@/modules/core/components/ui/toaster';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Order Engine', href: '/dashboard/orders', icon: Utensils },
  { label: 'Restaurants', href: '/dashboard/restaurants', icon: Store },
  { label: 'Floor & Tables', href: '/dashboard/tables', icon: Grid },
  { label: 'Reservations', href: '/dashboard/reservations', icon: CalendarDays },
  { label: 'Menu Catalog', href: '/dashboard/menu', icon: Package },
  { label: 'Inventory & BOM', href: '/dashboard/inventory', icon: Boxes },
  { label: 'POS Terminal', href: '/pos', icon: UtensilsCrossed },
  { label: 'KDS Kitchen', href: '/kds', icon: MonitorPlay },
  { label: 'Security RBAC', href: '/dashboard/security', icon: Shield },
  { label: 'Reports', href: '/dashboard/reports', icon: FileBarChart }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showOrgModal, setShowOrgModal] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── SIDEBAR NAVIGATION ───────────────────────────────────── */}
      <aside className="w-64 flex-col border-r border-border bg-card hidden md:flex">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground">Trinetra v2.0</h2>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">Restaurant OS</p>
          </div>
        </div>

        {/* Tenant Branch Badge */}
        <div className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{user.restaurantName}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{user.branchName}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-foreground truncate">{user.fullName}</p>
              <Badge variant="outline" className="mt-0.5 text-[10px] font-mono">
                {user.role}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                toast('Logged out user session', 'info');
                router.push('/login');
              }}
              title="Log Out"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT SHELL ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{user.organizationName}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowOrgModal(true)}
            >
              <Plus className="h-3 w-3" />
              <span>New Tenant</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                window.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              <Command className="h-3.5 w-3.5" />
              <span>Quick Search...</span>
              <kbd className="ml-2 rounded border border-border bg-card px-1.5 font-mono text-[10px]">Cmd+K</kbd>
            </button>

            <ThemeToggle />
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Command Palette Component */}
      <CommandPalette />

      {/* New Tenant Creation Modal */}
      {showOrgModal && (
        <CreateTenantModal onClose={() => setShowOrgModal(false)} />
      )}
    </div>
  );
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const [orgName, setOrgName] = React.useState('');
  const [restName, setRestName] = React.useState('');
  const [branchName, setBranchName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Create Organization via API
      const orgRes = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName })
      });
      const orgData = await orgRes.json();
      if (!orgData.success) throw new Error(orgData.error);

      // 2. Create Restaurant via API
      const restRes = await fetch('/api/v1/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgData.data.id, name: restName })
      });
      const restData = await restRes.json();
      if (!restData.success) throw new Error(restData.error);

      // 3. Create Branch via API
      const branchRes = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restData.data.id, name: branchName, address: 'Main Street Site' })
      });
      const branchData = await branchRes.json();
      if (!branchData.success) throw new Error(branchData.error);

      toast(`Tenant Created: ${orgName} > ${restName} > ${branchName}`, 'success');
      onClose();
    } catch (err: any) {
      toast(`Creation Failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-foreground">Create Multi-Tenant Hierarchy</h3>
        <p className="text-xs text-muted-foreground">Persist Organization, Restaurant, and Branch models to PostgreSQL via Prisma API</p>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Organization Name</label>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Apex Restaurant Group"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Restaurant Brand Name</label>
            <input
              value={restName}
              onChange={e => setRestName(e.target.value)}
              placeholder="e.g. Apex Gourmet Pizza"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Branch Outlet Name</label>
            <input
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              placeholder="e.g. Uptown Branch"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Tenant Hierarchy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
