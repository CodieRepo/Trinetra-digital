'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  QrCode,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Layers,
  Clock,
  User,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { TableQrModal } from './TableQrModal';
import { AddTableModal, FloorOption } from './AddTableModal';
import { DeleteTableModal } from './DeleteTableModal';

export interface TableItem {
  id: string;
  table_number: string;
  table_token: string;
  floor_id: string | null;
  floor_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SessionData {
  id: string;
  table: { id: string; table_number: string } | null;
  status: string;
  opened_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string;
  paid_at: string | null;
  order_count: number;
  session_total: number;
  orders: Array<{
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    items: Array<{ id: string; name: string; quantity: number }>;
  }>;
}

interface FloorTablesWorkspaceProps {
  tables: TableItem[];
  sessions: SessionData[];
  floors: FloorOption[];
  restaurantName: string;
  currency: string;
  onAddTable: (tableNumber: string, floorId: string | null) => Promise<boolean>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onExportAllQrs: () => Promise<void>;
  onRefresh: () => void;
  onSelectTableSession?: (session: SessionData) => void;
  isExportingQrs?: boolean;
}

export const FloorTablesWorkspace: React.FC<FloorTablesWorkspaceProps> = ({
  tables,
  sessions,
  floors,
  restaurantName,
  currency,
  onAddTable,
  onDeleteTable,
  onExportAllQrs,
  onRefresh,
  onSelectTableSession,
  isExportingQrs = false,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'billing'>('all');

  // Modals state
  const [qrModalTable, setQrModalTable] = useState<TableItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModalTable, setDeleteModalTable] = useState<TableItem | null>(null);

  // Map active session by table_number
  const activeSessionMap = useMemo(() => {
    const map = new Map<string, SessionData>();
    sessions.forEach((s) => {
      if (s.table?.table_number) {
        map.set(s.table.table_number.toLowerCase(), s);
      }
    });
    return map;
  }, [sessions]);

  // Build dynamic floor/section tabs from persisted floor data
  const sections = useMemo(() => {
    const list: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: 'All Tables', count: tables.length },
    ];

    // Add a tab for each active floor
    floors.forEach((floor) => {
      list.push({
        id: floor.id,
        label: floor.name,
        count: tables.filter((t) => t.floor_id === floor.id).length,
      });
    });

    // Add Unassigned tab if there are tables without a floor
    const unassignedCount = tables.filter((t) => !t.floor_id).length;
    if (unassignedCount > 0) {
      list.push({ id: 'unassigned', label: 'Unassigned', count: unassignedCount });
    }

    return list;
  }, [tables, floors]);

  // Filtered tables using persisted floor_id (not prefix heuristics)
  const filteredTables = useMemo(() => {
    return tables
      .filter((table) => {
        // Floor/section filter using canonical floor_id
        if (selectedSection === 'unassigned') {
          if (table.floor_id) return false;
        } else if (selectedSection !== 'all') {
          if (table.floor_id !== selectedSection) return false;
        }

        const session = activeSessionMap.get(table.table_number.toLowerCase());

        // Status Filter
        if (statusFilter === 'available' && session) return false;
        if (statusFilter === 'occupied' && (!session || session.payment_status === 'paid')) return false;
        if (statusFilter === 'billing' && (!session || session.payment_status !== 'paid')) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesNum = table.table_number.toLowerCase().includes(q);
          const matchesGuest = session?.customer_name?.toLowerCase().includes(q);
          const matchesFloor = table.floor_name?.toLowerCase().includes(q);
          return matchesNum || !!matchesGuest || !!matchesFloor;
        }

        return true;
      })
      .sort((a, b) => {
        const numA = parseInt(a.table_number.replace(/\D/g, ''), 10);
        const numB = parseInt(b.table_number.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.table_number.localeCompare(b.table_number);
      });
  }, [tables, selectedSection, statusFilter, searchQuery, activeSessionMap]);

  // Compute table operational state
  const getTableState = (table: TableItem) => {
    const session = activeSessionMap.get(table.table_number.toLowerCase());
    if (!session) {
      return {
        key: 'available',
        label: 'Available',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    }
    if (session.payment_status === 'paid') {
      return {
        key: 'settled',
        label: 'Settled / Turnover',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        dotClass: 'bg-teal-500',
      };
    }
    const hasUnservedOrders = session.orders?.some((o) => ['placed', 'preparing', 'ready'].includes(o.status));
    if (hasUnservedOrders) {
      return {
        key: 'active',
        label: 'Occupied · Kitchen Active',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500 animate-pulse',
      };
    }
    return {
      key: 'billing',
      label: 'Occupied · Bill Pending',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
      dotClass: 'bg-amber-500',
    };
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  const getElapsedTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just seated';
    if (mins < 60) return `${mins}m seated`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m seated`;
  };

  // Determine the default floor for the Add Table modal
  const defaultFloorForModal = selectedSection !== 'all' && selectedSection !== 'unassigned'
    ? selectedSection
    : floors.length > 0 ? floors[0].id : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Floor & Table Header Banner ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs text-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5" /> Dining Layout
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {tables.length} Total Tables · {activeSessionMap.size} Active Sessions
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold text-slate-900 tracking-tight">
              Floor & Table Management
            </h1>
            <p className="text-xs text-slate-500">
              Manage dining tables, track real-time occupancy, print QR ordering stickers, and launch table orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onExportAllQrs}
              disabled={isExportingQrs || tables.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/80 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-amber-700" />
              Export All QRs
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Table
            </button>
          </div>
        </div>

        {/* ── Floor Section Tabs & Filter Controls ───────────────────────── */}
        <div className="mt-5 flex flex-col gap-3 pt-4 border-t border-slate-100 lg:flex-row lg:items-center lg:justify-between">
          {/* Section pill tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedSection === sec.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span>{sec.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    selectedSection === sec.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {sec.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table or guest..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'available', label: 'Available' },
                  { id: 'occupied', label: 'Occupied' },
                  { id: 'billing', label: 'Billing' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Grid ─────────────────────────────────────────────────── */}
      {filteredTables.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTables.map((table) => {
            const state = getTableState(table);
            const session = activeSessionMap.get(table.table_number.toLowerCase());

            return (
              <div
                key={table.id}
                className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Table Number + State Badge */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-mono font-black text-sm shadow-xs">
                        {table.table_number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-mono">
                          Table {table.table_number}
                        </h3>
                        {table.floor_name ? (
                          <p className="text-[10px] text-amber-700 font-semibold">
                            {table.floor_name}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Token: {table.table_token.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${state.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${state.dotClass}`} />
                      {state.label}
                    </span>
                  </div>

                  {/* Active Session Body */}
                  {session ? (
                    <div className="mt-3.5 space-y-2 rounded-xl bg-gradient-to-b from-slate-50/90 to-amber-50/20 p-3 border border-slate-100">
                      {session.customer_name && (
                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium truncate">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {session.customer_name}
                          </span>
                          {session.customer_phone && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {session.customer_phone}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {getElapsedTime(session.opened_at)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {session.order_count} {session.order_count === 1 ? 'Order' : 'Orders'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                          Total Bill
                        </span>
                        <span className="text-sm font-black font-mono text-slate-900">
                          {formatPrice(session.session_total)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="my-5 flex flex-col items-center justify-center text-center py-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Ready for Seating</p>
                      <p className="text-[11px] text-slate-400 max-w-[180px]">
                        Scan QR code or take an order to start dining session.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrModalTable(table)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title="Show QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5 text-amber-700" />
                      <span>QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalTable(table)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer border-0"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {session && onSelectTableSession ? (
                    <button
                      type="button"
                      onClick={() => onSelectTableSession(session)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                    >
                      <span>Session</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-amber-200 bg-gradient-to-b from-[#FFFDF9] to-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery ? 'No Matching Tables Found' : 'No Dining Tables Configured Yet'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No tables match "${searchQuery}". Clear your search query to view all tables.`
              : 'Add your first dining table to configure table numbers, guest QR ordering stickers, and POS seating.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Your First Table
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <TableQrModal
        isOpen={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        table={qrModalTable}
        restaurantName={restaurantName}
      />

      <AddTableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTable={onAddTable}
        existingTableNumbers={tables.map((t) => t.table_number)}
        floors={floors}
        defaultFloorId={defaultFloorForModal}
      />

      <DeleteTableModal
        isOpen={!!deleteModalTable}
        onClose={() => setDeleteModalTable(null)}
        onConfirmDelete={async () => {
          if (deleteModalTable) {
            await onDeleteTable(deleteModalTable.id);
          }
        }}
        tableNumber={deleteModalTable?.table_number || ''}
        hasActiveSession={
          deleteModalTable ? activeSessionMap.has(deleteModalTable.table_number.toLowerCase()) : false
        }
      />
    </div>
  );
};
