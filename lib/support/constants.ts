export type SupportTicketCategoryValue = 'TECHNICAL' | 'BILLING' | 'COURSE_ISSUE' | 'ACCOUNT' | 'OTHER';
export type SupportTicketPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupportTicketStatusValue = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';

export const SUPPORT_CATEGORY_OPTIONS: Array<{ value: SupportTicketCategoryValue; label: string }> = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'COURSE_ISSUE', label: 'Course Issue' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'OTHER', label: 'Other' },
];

export const SUPPORT_PRIORITY_OPTIONS: Array<{ value: SupportTicketPriorityValue; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export const SUPPORT_STATUS_OPTIONS: Array<{ value: SupportTicketStatusValue; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_ON_USER', label: 'Waiting On User' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export const FIRST_RESPONSE_SLA_HOURS: Record<SupportTicketPriorityValue, number> = {
  LOW: 72,
  MEDIUM: 24,
  HIGH: 4,
};

export const RESOLUTION_SLA_HOURS: Record<SupportTicketPriorityValue, number> = {
  LOW: 120,
  MEDIUM: 72,
  HIGH: 24,
};

export function priorityBadgeClass(priority: SupportTicketPriorityValue): string {
  if (priority === 'HIGH') return 'bg-red-100 text-red-700';
  if (priority === 'MEDIUM') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export function statusBadgeClass(status: SupportTicketStatusValue): string {
  if (status === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (status === 'IN_PROGRESS') return 'bg-indigo-100 text-indigo-700';
  if (status === 'WAITING_ON_USER') return 'bg-amber-100 text-amber-700';
  if (status === 'RESOLVED') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}
