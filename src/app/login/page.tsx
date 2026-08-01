'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth, UserSession } from '@/modules/core/components/auth-provider';
import { Role } from '@/modules/core/types/permission';
import { Button } from '@/modules/core/components/ui/button';
import { Input } from '@/modules/core/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { ThemeToggle } from '@/modules/core/components/theme-toggle';

const DEMO_ACCOUNTS: Array<{ role: Role; label: string; email: string }> = [
  { role: 'OWNER', label: 'Owner (Full Access)', email: 'owner@trinetra.io' },
  { role: 'MANAGER', label: 'Manager (Ops & Reports)', email: 'manager@trinetra.io' },
  { role: 'CASHIER', label: 'Cashier (POS Checkout)', email: 'cashier@trinetra.io' },
  { role: 'CHEF', label: 'Chef (KDS Bump Bar)', email: 'chef@trinetra.io' },
  { role: 'WAITER', label: 'Waiter (Tables & Orders)', email: 'waiter@trinetra.io' }
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('owner@trinetra.io');
  const [password, setPassword] = React.useState('password123');
  const [selectedRole, setSelectedRole] = React.useState<Role>('OWNER');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeDemoLogin(selectedRole, email);
  };

  const executeDemoLogin = (role: Role, userEmail: string) => {
    const session: UserSession = {
      id: `usr_${role.toLowerCase()}_01`,
      email: userEmail,
      fullName: `${role.charAt(0) + role.slice(1).toLowerCase()} User`,
      role,
      organizationId: 'org_trinetra_01',
      organizationName: 'Trinetra Hospitality Group',
      restaurantId: 'rest_bistro_01',
      restaurantName: 'Downtown Bistro Concept',
      branchId: 'br_main_01',
      branchName: 'Downtown Main Branch'
    };

    login(session);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Utensils className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trinetra Restaurant OS</h1>
          <p className="text-sm text-muted-foreground">Sign in to your multi-tenant operating system session</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Shell</CardTitle>
            <CardDescription>Enter account credentials or choose a quick demo role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full gap-2 mt-2">
                <span>Sign In to Session</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-semibold">Quick RBAC Demo Switch</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(acc.role);
                    setEmail(acc.email);
                    executeDemoLogin(acc.role, acc.email);
                  }}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{acc.label}</span>
                  </div>
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
