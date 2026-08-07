'use client';

import React, { useState, useEffect } from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { LayoutGrid, Plus, Trash2, Users, Check, RefreshCw, Layers } from 'lucide-react';

interface Floor {
  id: string;
  name: string;
  sort_order: number;
}

interface Table {
  id: string;
  floor_id: string | null;
  table_number: string;
  capacity: number;
  status: string;
}

export const Step4FloorBlueprint: React.FC = () => {
  const { restaurantId, updateStep4 } = useSetupWizardStore();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [isAddingFloor, setIsAddingFloor] = useState(false);

  // Table form modal/drawer state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  const fetchFloorsAndTables = async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/restaurant-os/provisioning/floors?restaurantId=${restaurantId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const loadedFloors: Floor[] = json.data.floors || [];
        const loadedTables: Table[] = json.data.tables || [];
        setFloors(loadedFloors);
        setTables(loadedTables);

        if (loadedFloors.length > 0 && !activeFloorId) {
          setActiveFloorId(loadedFloors[0].id);
        }

        updateStep4({
          floors: loadedFloors.map((f) => ({ id: f.id, name: f.name, sortOrder: f.sort_order })),
          tables: loadedTables.map((t) => ({
            id: t.id,
            floorId: t.floor_id,
            tableNumber: t.table_number,
            capacity: t.capacity,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to load floor layout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorsAndTables();
  }, [restaurantId]);

  const handleCreateFloor = async () => {
    if (!restaurantId || !newFloorName.trim()) return;
    try {
      const res = await fetch('/api/restaurant-os/provisioning/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFloor',
          restaurantId,
          name: newFloorName.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewFloorName('');
        setIsAddingFloor(false);
        await fetchFloorsAndTables();
        setActiveFloorId(json.data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm('Are you sure you want to delete this floor section?')) return;
    try {
      await fetch('/api/restaurant-os/provisioning/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteFloor', floorId }),
      });
      await fetchFloorsAndTables();
      const remaining = floors.filter((f) => f.id !== floorId);
      setActiveFloorId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTable = async () => {
    if (!restaurantId || !activeFloorId) return;
    const tableNum = newTableNumber.trim() || `T-${tables.length + 1}`;
    try {
      await fetch('/api/restaurant-os/provisioning/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createTable',
          restaurantId,
          floorId: activeFloorId,
          tableNumber: tableNum,
          capacity: newTableCapacity,
        }),
      });
      setNewTableNumber('');
      setNewTableCapacity(4);
      await fetchFloorsAndTables();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      await fetch('/api/restaurant-os/provisioning/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTable', tableId }),
      });
      await fetchFloorsAndTables();
    } catch (err) {
      console.error(err);
    }
  };

  const activeTables = tables.filter((t) => t.floor_id === activeFloorId);
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <LayoutGrid className="w-4 h-4" /> Step 4 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Floor & Table Builder</h2>
        <p className="text-slate-400 text-sm mt-1">
          Design your physical dining areas, add tables, configure seating capacities, and preview table arrangements.
        </p>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            {floors.length}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Floor Sections</div>
            <div className="text-lg font-bold text-white leading-tight">Configured</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            {tables.length}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Dining Tables</div>
            <div className="text-lg font-bold text-white leading-tight">Active</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            {totalCapacity}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Covers</div>
            <div className="text-lg font-bold text-white leading-tight">Seating Capacity</div>
          </div>
        </div>
      </div>

      {/* Floor Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {floors.map((f) => (
          <div key={f.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveFloorId(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeFloorId === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" /> {f.name}
            </button>
            {floors.length > 1 && activeFloorId === f.id && (
              <button
                type="button"
                onClick={() => handleDeleteFloor(f.id)}
                title="Delete floor section"
                className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {isAddingFloor ? (
          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 p-1 rounded-xl">
            <input
              type="text"
              autoFocus
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              placeholder="e.g. AC Hall, Rooftop"
              className="px-3 py-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-36"
            />
            <button
              type="button"
              onClick={handleCreateFloor}
              className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingFloor(true)}
            className="px-3 py-2 border border-dashed border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 rounded-xl text-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Floor
          </button>
        )}
      </div>

      {/* Table Builder Canvas */}
      {floors.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-400 text-sm">No floor section created yet. Create your first floor to start adding tables.</p>
          <button
            type="button"
            onClick={() => {
              setNewFloorName('Main Dining');
              handleCreateFloor();
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl"
          >
            Create Main Dining Floor
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Table Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder={`Table Number (e.g. T-${activeTables.length + 1})`}
                className="px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 w-48 font-mono"
              />

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400">Seats:</span>
                <select
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value, 10))}
                  className="bg-transparent font-bold focus:outline-none text-amber-400 cursor-pointer"
                >
                  {[2, 4, 6, 8, 10, 12].map((num) => (
                    <option key={num} value={num} className="bg-slate-900 text-white">
                      {num} Seats
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddTable}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" /> Add Table to Floor
              </button>
            </div>

            <button
              type="button"
              onClick={fetchFloorsAndTables}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Refresh canvas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Interactive Grid Canvas */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[320px]">
            {activeTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <LayoutGrid className="w-12 h-12 stroke-1 mb-2 text-slate-600" />
                <p className="text-sm font-medium">No tables added to this floor section yet</p>
                <p className="text-xs text-slate-600 mt-1">Use the table controls above to add dining tables</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {activeTables.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col items-center justify-between gap-3 shadow-lg relative group transition-all"
                  >
                    {/* Delete Icon */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTable(t.id)}
                      className="absolute top-2 right-2 p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Seating Dots Top & Bottom */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(t.capacity / 2, 4) }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-slate-700" />
                      ))}
                    </div>

                    <div className="text-center my-1">
                      <div className="font-mono font-bold text-white text-base">{t.table_number}</div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full mt-1">
                        <Users className="w-3 h-3" /> {t.capacity} Seats
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(t.capacity / 2, 4) }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-slate-700" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
