import React, { useState } from "react";
import { Lead, TimelineEvent, Task, LeadNote } from "../../types/crm";
import { Phone, Briefcase, Activity, Clock, Plus, FileText } from "lucide-react";

interface LeadDetailsPanelProps {
  lead: Lead | null;
  timeline: TimelineEvent[];
  tasks: Task[];
  notes: LeadNote[];
  onAddNote: (note: string) => Promise<void>;
  onAddTask: (title: string, priority: string) => Promise<void>;
}

export const LeadDetailsPanel: React.FC<LeadDetailsPanelProps> = ({
  lead,
  timeline,
  tasks,
  notes,
  onAddNote,
  onAddTask,
}) => {
  const [activeTab, setActiveTab] = useState<"journey" | "tasks" | "notes">("journey");
  const [newNote, setNewNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("high");
  const [submitting, setSubmitting] = useState(false);

  if (!lead) return null;

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddNote(newNote);
      setNewNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddTask(newTaskTitle, newTaskPriority);
      setNewTaskTitle("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto shrink-0 p-4 space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-800 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Lead Intelligence</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            {lead.status}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-white">{lead.phone}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Service: <strong className="text-slate-100">{lead.service_interest || "Not Specified"}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Current Flow Node: <strong className="text-emerald-400 font-mono">Node {lead.current_flow_node}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>First Engaged: {new Date(lead.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("journey")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === "journey"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Journey ({timeline.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === "tasks"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Notes ({notes.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Tab 1: Journey Timeline */}
        {activeTab === "journey" && (
          <div className="space-y-3">
            {timeline.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No flow timeline events recorded yet.</p>
            ) : (
              timeline.map((evt) => (
                <div key={evt.id} className="relative pl-5 border-l-2 border-slate-800 space-y-1 py-1">
                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="text-xs font-bold text-slate-200">{evt.title}</div>
                  {evt.description && <div className="text-[11px] text-slate-400">{evt.description}</div>}
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(evt.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Tasks */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <form onSubmit={handleAddTaskSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="Assign new follow-up task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
              <div className="flex gap-2">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button
                  type="submit"
                  disabled={submitting || !newTaskTitle.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium py-1.5 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No active follow-up tasks.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-200">{task.title}</span>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${task.priority === 'urgent' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && <p className="text-[11px] text-slate-400">{task.description}</p>}
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Assigned to: {task.assigned_to || 'Sales Team'}</span>
                      <span className="text-emerald-400 font-mono">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Notes */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <form onSubmit={handleAddNoteSubmit} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Write internal note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs p-3 focus:outline-none focus:border-emerald-500 placeholder-slate-500 resize-none"
              />
              <button
                type="submit"
                disabled={submitting || !newNote.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium py-2 transition-colors flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Save Internal Note
              </button>
            </form>

            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No notes added yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.note}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                      <span>By: {note.author}</span>
                      <span>{new Date(note.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
