'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addSupportTicketReplyAction,
  assignSupportTicketAction,
  getSupportQueueAction,
  getSupportTeamMembersAction,
  getSupportTicketDetailsAction,
  updateSupportTicketPriorityAction,
  updateSupportTicketStatusAction,
} from '@/app/actions/support';
import {
  type SupportTicketCategoryValue,
  type SupportTicketPriorityValue,
  type SupportTicketStatusValue,
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
  SUPPORT_STATUS_OPTIONS,
  priorityBadgeClass,
  statusBadgeClass,
} from '@/lib/support/constants';

type SupportUser = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type QueueTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportTicketCategoryValue;
  priority: SupportTicketPriorityValue;
  status: SupportTicketStatusValue;
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string | null;
  createdByUser: SupportUser;
  assignedToUser: SupportUser | null;
  _count: { messages: number; attachments: number };
};

type TicketDetails = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: SupportTicketCategoryValue;
  priority: SupportTicketPriorityValue;
  status: SupportTicketStatusValue;
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string | null;
  messages: Array<{
    id: string;
    message: string;
    createdAt: string;
    isInternal: boolean;
    authorUser: { id: string; username: string; role: string; firstName: string | null; lastName: string | null };
    attachments: Array<{ id: string; originalName: string; storageName: string }>;
  }>;
};

function fullName(user: SupportUser | null) {
  if (!user) return 'Unassigned';
  const composed = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return composed || user.username;
}

export default function SupportAdminPanel() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);
  const [teamMembers, setTeamMembers] = useState<SupportUser[]>([]);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string>('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<
    Array<{ originalName: string; storageName: string; mimeType: string; size: number }>
  >([]);

  const [statusFilter, setStatusFilter] = useState<SupportTicketStatusValue | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriorityValue | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategoryValue | 'ALL'>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<'ALL' | 'UNASSIGNED' | 'MINE'>('ALL');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedSummary = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return [];

    const results: Array<{ originalName: string; storageName: string; mimeType: string; size: number }> = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      const response = await fetch('/api/support/upload', { method: 'POST', body: fd });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to upload ${file.name}`);
      }

      results.push({
        originalName: data.originalName,
        storageName: data.storageName,
        mimeType: data.mimeType,
        size: data.size,
      });
    }

    return results;
  }

  async function loadQueue() {
    setIsLoading(true);
    setError(null);
    try {
      const [queue, members] = await Promise.all([
        getSupportQueueAction({
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          assigned: assignedFilter,
        }),
        getSupportTeamMembersAction(),
      ]);

      setTickets(queue.tickets as QueueTicket[]);
      setCurrentAdminUserId(queue.currentAdminUserId);
      setTeamMembers(members as SupportUser[]);

      if (!selectedTicketId && queue.tickets.length > 0) {
        setSelectedTicketId(queue.tickets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support queue');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDetails(ticketId: string) {
    try {
      const details = await getSupportTicketDetailsAction(ticketId);
      if (!details) {
        setSelectedTicket(null);
        return;
      }
      setSelectedTicket(details as TicketDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket details');
    }
  }

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, categoryFilter, assignedFilter]);

  useEffect(() => {
    if (selectedTicketId) {
      loadDetails(selectedTicketId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  async function handleStatusChange(ticketId: string, status: SupportTicketStatusValue) {
    const result = await updateSupportTicketStatusAction({ ticketId, status });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    await loadQueue();
    await loadDetails(ticketId);
  }

  async function handlePriorityChange(ticketId: string, priority: SupportTicketPriorityValue) {
    const result = await updateSupportTicketPriorityAction({ ticketId, priority });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    await loadQueue();
    await loadDetails(ticketId);
  }

  async function handleAssign(ticketId: string, assignedToUserId: string | null) {
    const result = await assignSupportTicketAction({ ticketId, assignedToUserId });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    await loadQueue();
    await loadDetails(ticketId);
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;

    const result = await addSupportTicketReplyAction({
      ticketId: selectedTicketId,
      message: replyMessage,
      isInternal: false,
      attachments: replyFiles,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setReplyMessage('');
    setReplyFiles([]);
    await loadQueue();
    await loadDetails(selectedTicketId);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Support Queue</h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Assign tickets, respond to users, and manage SLA targets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SupportTicketStatusValue | 'ALL')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            {SUPPORT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as SupportTicketPriorityValue | 'ALL')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All priorities</option>
            {SUPPORT_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as SupportTicketCategoryValue | 'ALL')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All categories</option>
            {SUPPORT_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value as 'ALL' | 'UNASSIGNED' | 'MINE')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All assignments</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="MINE">Assigned to me</option>
          </select>
        </div>
      </section>

      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900">Tickets</h2>
            <button onClick={loadQueue} className="text-xs font-black uppercase tracking-wider text-indigo-600">
              Refresh
            </button>
          </div>

          {isLoading && tickets.length === 0 ? (
            <p className="text-sm text-slate-500">Loading queue...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-slate-500">No tickets match current filters.</p>
          ) : (
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                    selectedTicketId === ticket.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">{ticket.ticketNumber}</p>
                  <p className="mt-1 font-semibold text-slate-900 line-clamp-2 text-sm">{ticket.subject}</p>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityBadgeClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">{fullName(ticket.assignedToUser)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm xl:col-span-2">
          {!selectedTicket || !selectedSummary ? (
            <p className="text-sm text-slate-500">Select a ticket to manage it.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">
                    {selectedTicket.ticketNumber} • {selectedTicket.category.replace('_', ' ')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as SupportTicketStatusValue)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {SUPPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value as SupportTicketPriorityValue)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {SUPPORT_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSummary.assignedToUser?.id ?? ''}
                  onChange={(e) => handleAssign(selectedTicket.id, e.target.value || null)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {fullName(member)}{member.id === currentAdminUserId ? ' (Me)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Requester</p>
                  <p className="font-semibold text-slate-700 mt-1">{fullName(selectedSummary.createdByUser)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">First Response Due</p>
                  <p className="font-semibold text-slate-700 mt-1">{new Date(selectedTicket.firstResponseDueAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {selectedTicket.messages.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-black text-slate-700 uppercase tracking-widest">
                        {entry.authorUser.role === 'admin' ? 'Support Team' : 'Customer'}
                      </p>
                      <p className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{entry.message}</p>
                    {entry.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={`/uploads/support/${file.storageName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                          >
                            {file.originalName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="space-y-3 border-t border-slate-200 pt-4">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm min-h-24"
                  placeholder="Write a response to the customer"
                  required
                />
                <input
                  type="file"
                  multiple
                  onChange={async (e) => {
                    try {
                      const files = await uploadFiles(e.target.files);
                      setReplyFiles(files);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
                <button className="rounded-xl px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black uppercase tracking-wider">
                  Send Response
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
