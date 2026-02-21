'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addSupportTicketReplyAction,
  createSupportTicketAction,
  getMySupportTicketsAction,
  getSupportTicketDetailsAction,
  getUnreadSupportNotificationsCountAction,
  markSupportNotificationsReadAction,
} from '@/app/actions/support';
import {
  type SupportTicketCategoryValue,
  type SupportTicketPriorityValue,
  type SupportTicketStatusValue,
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
  priorityBadgeClass,
  statusBadgeClass,
} from '@/lib/support/constants';

type TicketSummary = {
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
  assignedToUser?: { firstName: string | null; lastName: string | null; username: string } | null;
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
    authorUser: {
      id: string;
      username: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
    };
    attachments: Array<{
      id: string;
      originalName: string;
      storageName: string;
      size: number;
    }>;
  }>;
};

type UploadedFile = {
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
};

function fullName(user: { firstName: string | null; lastName: string | null; username: string }) {
  const text = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return text || user.username;
}

function isSlaBreached(dueAtIso: string | null, status: SupportTicketStatusValue) {
  if (!dueAtIso) return false;
  if (status === 'RESOLVED' || status === 'CLOSED') return false;
  return new Date(dueAtIso).getTime() < Date.now();
}

export default function SupportPortal() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicketCategoryValue>('TECHNICAL');
  const [priority, setPriority] = useState<SupportTicketPriorityValue>('MEDIUM');
  const [newReply, setNewReply] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [replyFiles, setReplyFiles] = useState<UploadedFile[]>([]);

  async function uploadFiles(files: FileList | null): Promise<UploadedFile[]> {
    if (!files || files.length === 0) return [];

    const results: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);

      const response = await fetch('/api/support/upload', {
        method: 'POST',
        body: fd,
      });
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

  const selectedSummary = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  async function loadTickets() {
    setIsLoading(true);
    setError(null);
    try {
      const [ticketData, unreadData] = await Promise.all([
        getMySupportTicketsAction(),
        getUnreadSupportNotificationsCountAction(),
      ]);
      setTickets(ticketData as TicketSummary[]);
      setUnreadCount(unreadData.unreadCount);

      if (ticketData.length > 0 && !selectedTicketId) {
        setSelectedTicketId(ticketData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTicketDetails(ticketId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const details = await getSupportTicketDetailsAction(ticketId);
      if (!details) {
        setError('Ticket not found or access denied');
        return;
      }
      setSelectedTicket(details as TicketDetails);
      await markSupportNotificationsReadAction(ticketId);
      const unreadData = await getUnreadSupportNotificationsCountAction();
      setUnreadCount(unreadData.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetails(selectedTicketId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  async function handleSubmitTicket(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const result = await createSupportTicketAction({
        subject,
        description,
        category,
        priority,
        attachments: uploadedFiles,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(`${result.message}. You can track updates below.`);
      setSubject('');
      setDescription('');
      setCategory('TECHNICAL');
      setPriority('MEDIUM');
      setUploadedFiles([]);

      await loadTickets();
      if (result.ticketId) {
        setSelectedTicketId(result.ticketId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    }
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;

    setMessage(null);
    setError(null);

    try {
      const result = await addSupportTicketReplyAction({
        ticketId: selectedTicketId,
        message: newReply,
        attachments: replyFiles,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage('Reply sent. You will be notified when support replies.');
      setNewReply('');
      setReplyFiles([]);
      await loadTickets();
      await loadTicketDetails(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Support Center</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Submit tickets, track status, and receive support responses.
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-black">
            Unread Updates: {unreadCount}
          </div>
        </div>

        <form onSubmit={handleSubmitTicket} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              placeholder="I cannot access my course after purchase"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportTicketCategoryValue)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              {SUPPORT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as SupportTicketPriorityValue)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              {SUPPORT_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm min-h-28"
              placeholder="Describe the issue with enough detail so support can reproduce it quickly"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Attachments</label>
            <input
              type="file"
              multiple
              onChange={async (e) => {
                try {
                  const files = await uploadFiles(e.target.files);
                  setUploadedFiles(files);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Upload failed');
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
            {uploadedFiles.length > 0 && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {uploadedFiles.length} attachment(s) uploaded
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <button className="rounded-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-wider">
              Submit Ticket
            </button>
          </div>
        </form>
      </section>

      {message && <p className="text-sm text-emerald-700 font-semibold">{message}</p>}
      {error && <p className="text-sm text-red-700 font-semibold">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900">My Tickets</h2>
            <button
              onClick={loadTickets}
              className="text-xs font-black uppercase tracking-wider text-indigo-600"
            >
              Refresh
            </button>
          </div>

          {isLoading && tickets.length === 0 ? (
            <p className="text-sm text-slate-500">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-slate-500">No tickets yet.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-widest">{ticket.ticketNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityBadgeClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900 line-clamp-2 text-sm">{ticket.subject}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className={`px-2 py-0.5 rounded-full ${statusBadgeClass(ticket.status)}`}>{ticket.status}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm xl:col-span-2">
          {!selectedTicket || !selectedSummary ? (
            <p className="text-sm text-slate-500">Select a ticket to view full details.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">
                    {selectedTicket.ticketNumber} • {selectedTicket.category.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Assigned: {selectedSummary.assignedToUser ? fullName(selectedSummary.assignedToUser) : 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">First Response SLA</p>
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      isSlaBreached(selectedTicket.firstResponseDueAt, selectedTicket.status)
                        ? 'text-red-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {new Date(selectedTicket.firstResponseDueAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Resolution SLA</p>
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      isSlaBreached(selectedTicket.resolutionDueAt, selectedTicket.status)
                        ? 'text-red-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {selectedTicket.resolutionDueAt
                      ? new Date(selectedTicket.resolutionDueAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {selectedTicket.messages.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <p className="font-black text-slate-700 uppercase tracking-widest">
                        {item.authorUser.role === 'admin' ? 'Support Team' : 'You'}
                      </p>
                      <p className="text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{item.message}</p>

                    {item.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.attachments.map((file) => (
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
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm min-h-24"
                  placeholder="Add a reply"
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
                  Send Reply
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
