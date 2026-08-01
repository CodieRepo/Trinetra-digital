'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, UtensilsCrossed, MonitorPlay, Grid, Package, Shield, LogOut } from 'lucide-react';
import { useAuth } from './auth-provider';

export function CommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const { logout } = useAuth();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = React.useMemo(
    () => [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => router.push('/dashboard') },
      { id: 'pos', label: 'Open POS Terminal', icon: UtensilsCrossed, action: () => router.push('/pos') },
      { id: 'kds', label: 'Open KDS Kitchen Display', icon: MonitorPlay, action: () => router.push('/kds') },
      { id: 'tables', label: 'Manage Floorplan & Tables', icon: Grid, action: () => router.push('/dashboard/tables') },
      { id: 'inventory', label: 'Manage Raw Inventory', icon: Package, action: () => router.push('/dashboard/inventory') },
      { id: 'security', label: 'View Security & RBAC', icon: Shield, action: () => router.push('/dashboard/security') },
      { id: 'logout', label: 'Log Out User Session', icon: LogOut, action: () => { logout(); router.push('/login'); } }
    ],
    [router, logout]
  );

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands;
    return commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  }, [commands, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search (Cmd+K)..."
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No matching commands found.</div>
          ) : (
            filteredCommands.map(cmd => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Icon className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
