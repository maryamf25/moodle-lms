'use server';

import { revalidatePath } from 'next/cache';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '@prisma/client';
import { requireAppAuth } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import { FIRST_RESPONSE_SLA_HOURS, RESOLUTION_SLA_HOURS } from '@/lib/support/constants';
import { sendSupportTicketEmail } from '@/lib/support/email';
import { sendNotification } from '@/lib/notifications';

type UploadedSupportFile = {
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
};

interface ActionResult {
  ok: boolean;
  message: string;
}

interface CreateSupportTicketInput {
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  attachments?: UploadedSupportFile[];
}

interface AddSupportReplyInput {
  ticketId: string;
  message: string;
  attachments?: UploadedSupportFile[];
  isInternal?: boolean;
}

interface UpdateSupportTicketStatusInput {
  ticketId: string;
  status: SupportTicketStatus;
}

interface UpdateSupportTicketAssignmentInput {
  ticketId: string;
  assignedToUserId: string | null;
}

interface UpdateSupportTicketPriorityInput {
  ticketId: string;
  priority: SupportTicketPriority;
}

interface SupportQueueFilter {
  status?: SupportTicketStatus | 'ALL';
  priority?: SupportTicketPriority | 'ALL';
  category?: SupportTicketCategory | 'ALL';
  assigned?: 'ALL' | 'UNASSIGNED' | 'MINE';
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function sanitizeUploadedFiles(files?: UploadedSupportFile[]): UploadedSupportFile[] {
  if (!files || files.length === 0) return [];

  return files
    .filter(
      (file) =>
        Boolean(file.originalName) &&
        Boolean(file.storageName) &&
        Boolean(file.mimeType) &&
        Number.isFinite(file.size) &&
        file.size > 0,
    )
    .map((file) => ({
      ...file,
      storageName: file.storageName.replace(/[^a-zA-Z0-9._-]/g, ''),
      originalName: file.originalName.trim().slice(0, 255),
      mimeType: file.mimeType.trim().slice(0, 100),
      size: Math.floor(file.size),
    }));
}

async function getDbUserOrThrow(moodleUserId: number) {
  const dbUser = await prisma.user.findUnique({
    where: { moodleUserId },
    select: { id: true, username: true, email: true, role: true },
  });

  if (!dbUser) {
    throw new Error('Authenticated user is not synced in local database');
  }

  return dbUser;
}

async function generateTicketNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  for (let i = 0; i < 5; i += 1) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `SUP-${y}${m}${d}-${random}`;
    const existing = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      select: { id: true },
    });
    if (!existing) return ticketNumber;
  }

  return `SUP-${y}${m}${d}-${Date.now().toString().slice(-5)}`;
}

async function notifyUsers(input: {
  ticketId: string;
  message: string;
  type: string;
  recipientUserIds: string[];
}) {
  const uniqueRecipientIds = [...new Set(input.recipientUserIds.filter(Boolean))];
  if (uniqueRecipientIds.length === 0) return;

  await prisma.supportTicketNotification.createMany({
    data: uniqueRecipientIds.map((userId) => ({
      ticketId: input.ticketId,
      userId,
      type: input.type,
      message: input.message,
    })),
  });
}

async function emailTicketUpdate(input: {
  recipientEmails: string[];
  subject: string;
  html: string;
}) {
  const uniqueEmails = [...new Set(input.recipientEmails.filter(Boolean))];
  await Promise.all(uniqueEmails.map((to) => sendSupportTicketEmail({ to, subject: input.subject, html: input.html })));
}

function canAccessTicket(role: UserRole, dbUserId: string, ticket: { createdByUserId: string }): boolean {
  if (role === 'admin') return true;
  return ticket.createdByUserId === dbUserId;
}

function mapTicket(ticket: any) {
  return {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : null,
    firstResponseDueAt: ticket.firstResponseDueAt.toISOString(),
    resolutionDueAt: ticket.resolutionDueAt ? ticket.resolutionDueAt.toISOString() : null,
    closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
    lastRepliedAt: ticket.lastRepliedAt ? ticket.lastRepliedAt.toISOString() : null,
    messages: ticket.messages
      ? ticket.messages.map((message: any) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
        attachments: message.attachments
          ? message.attachments.map((attachment: any) => ({
            ...attachment,
            uploadedAt: attachment.uploadedAt ? attachment.uploadedAt.toISOString() : null,
          }))
          : [],
      }))
      : undefined,
    attachments: ticket.attachments
      ? ticket.attachments.map((attachment: any) => ({
        ...attachment,
        uploadedAt: attachment.uploadedAt ? attachment.uploadedAt.toISOString() : null,
      }))
      : undefined,
    notifications: ticket.notifications
      ? ticket.notifications.map((notification: any) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt ? notification.readAt.toISOString() : null,
      }))
      : undefined,
  };
}

export async function createSupportTicketAction(input: CreateSupportTicketInput): Promise<ActionResult & { ticketId?: string; ticketNumber?: string }> {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const subject = input.subject.trim();
  const description = input.description.trim();
  if (!subject) return { ok: false, message: 'Subject is required' };
  if (!description) return { ok: false, message: 'Description is required' };

  const createdAt = new Date();
  const ticketNumber = await generateTicketNumber();
  const attachments = sanitizeUploadedFiles(input.attachments);

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        ticketNumber,
        subject,
        description,
        category: input.category,
        priority: input.priority,
        createdByUserId: dbUser.id,
        firstResponseDueAt: addHours(createdAt, FIRST_RESPONSE_SLA_HOURS[input.priority]),
        resolutionDueAt: addHours(createdAt, RESOLUTION_SLA_HOURS[input.priority]),
        lastRepliedAt: createdAt,
        lastReplyByUserId: dbUser.id,
      },
    });

    const initialMessage = await tx.supportTicketMessage.create({
      data: {
        ticketId: created.id,
        authorUserId: dbUser.id,
        message: description,
        isInternal: false,
      },
    });

    if (attachments.length > 0) {
      await tx.supportTicketAttachment.createMany({
        data: attachments.map((file) => ({
          ticketId: created.id,
          messageId: initialMessage.id,
          uploadedByUserId: dbUser.id,
          originalName: file.originalName,
          storageName: file.storageName,
          mimeType: file.mimeType,
          size: file.size,
        })),
      });
    }

    return created;
  });

  // Nayi Notification user ko bhejna:
  await sendNotification({
    userId: dbUser.id,
    title: 'Ticket Submitted 🎫',
    message: `Aapka ticket "${ticket.subject}" humein mosool ho gaya hai. Hum jald isko dekhenge.`,
    type: 'SUPPORT',
    actionUrl: '/dashboard/support',
  });

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true },
  });

  // 2. System ke saare Admins ko dhoond kar unhein alert bhejein
  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      title: 'Action Required: New Support Ticket 🚨',
      message: `Ek user ne naya support ticket generate kiya hai. Fauran check karein.`,
      type: 'SYSTEM',
      actionUrl: `/dashboard/admin/support`,
    });
  }

  await notifyUsers({
    ticketId: ticket.id,
    type: 'ticket_created',
    message: `New ticket ${ticket.ticketNumber} created: ${ticket.subject}`,
    recipientUserIds: admins.map((admin) => admin.id),
  });

  await emailTicketUpdate({
    recipientEmails: [dbUser.email ?? ''],
    subject: `[Support ${ticket.ticketNumber}] Ticket submitted`,
    html: `<p>Your support ticket has been submitted.</p><p><strong>Ticket:</strong> ${ticket.ticketNumber}</p><p><strong>Status:</strong> OPEN</p>`,
  });

  await emailTicketUpdate({
    recipientEmails: admins.map((admin) => admin.email ?? ''),
    subject: `[Support ${ticket.ticketNumber}] New support ticket`,
    html: `<p>A new support ticket was submitted.</p><p><strong>Ticket:</strong> ${ticket.ticketNumber}</p><p><strong>Priority:</strong> ${ticket.priority}</p>`,
  });

  revalidatePath('/dashboard/support');
  revalidatePath('/dashboard/admin/support');

  return {
    ok: true,
    message: `Ticket ${ticket.ticketNumber} submitted successfully`,
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
  };
}

export async function getMySupportTicketsAction() {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const tickets = await prisma.supportTicket.findMany({
    where: { createdByUserId: dbUser.id },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      assignedToUser: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
      _count: {
        select: { messages: true, attachments: true },
      },
    },
  });

  return tickets.map(mapTicket);
}

export async function getSupportTicketDetailsAction(ticketId: string) {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdByUser: {
        select: { id: true, username: true, email: true, firstName: true, lastName: true },
      },
      assignedToUser: {
        select: { id: true, username: true, email: true, firstName: true, lastName: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: {
            select: { id: true, username: true, role: true, firstName: true, lastName: true },
          },
          attachments: true,
        },
      },
      notifications: {
        where: { userId: dbUser.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      attachments: {
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });

  if (!ticket) return null;
  if (!canAccessTicket(dbUser.role, dbUser.id, ticket)) return null;

  return mapTicket(ticket);
}

export async function addSupportTicketReplyAction(input: AddSupportReplyInput): Promise<ActionResult> {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const message = input.message.trim();
  if (!message) return { ok: false, message: 'Reply message is required' };

  const attachments = sanitizeUploadedFiles(input.attachments);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    include: {
      createdByUser: { select: { id: true, email: true } },
      assignedToUser: { select: { id: true, email: true } },
    },
  });
  if (!ticket) return { ok: false, message: 'Ticket not found' };
  if (!canAccessTicket(dbUser.role, dbUser.id, ticket)) return { ok: false, message: 'Not authorized' };

  if (ticket.status === 'CLOSED' && dbUser.role !== 'admin') {
    return { ok: false, message: 'Closed tickets can only be updated by support team' };
  }

  const now = new Date();
  const isAdminReply = dbUser.role === 'admin';

  const updatedTicket = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: dbUser.id,
        message,
        isInternal: Boolean(input.isInternal && isAdminReply),
      },
    });

    if (attachments.length > 0) {
      await tx.supportTicketAttachment.createMany({
        data: attachments.map((file) => ({
          ticketId: ticket.id,
          messageId: createdMessage.id,
          uploadedByUserId: dbUser.id,
          originalName: file.originalName,
          storageName: file.storageName,
          mimeType: file.mimeType,
          size: file.size,
        })),
      });
    }

    return tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: isAdminReply
          ? ticket.status === 'OPEN' || ticket.status === 'WAITING_ON_USER'
            ? 'IN_PROGRESS'
            : ticket.status
          : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
            ? 'OPEN'
            : 'IN_PROGRESS',
        firstResponseAt: isAdminReply && !ticket.firstResponseAt ? now : ticket.firstResponseAt,
        closedAt: isAdminReply && ticket.status === 'CLOSED' ? ticket.closedAt : null,
        lastRepliedAt: now,
        lastReplyByUserId: dbUser.id,
      },
      include: {
        createdByUser: { select: { id: true, email: true } },
        assignedToUser: { select: { id: true, email: true } },
      },
    });
  });

  const admins = isAdminReply
    ? []
    : await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true },
    });

  const recipientUserIds = isAdminReply
    ? [ticket.createdByUser.id]
    : ticket.assignedToUser
      ? [ticket.assignedToUser.id]
      : admins.map((admin) => admin.id);

  const recipientEmails = isAdminReply
    ? [ticket.createdByUser.email ?? '']
    : ticket.assignedToUser
      ? [ticket.assignedToUser.email ?? '']
      : admins.map((admin) => admin.email ?? '');

  await notifyUsers({
    ticketId: ticket.id,
    type: isAdminReply ? 'support_reply' : 'customer_reply',
    message: `New reply on ticket ${ticket.ticketNumber}`,
    recipientUserIds,
  });

  await emailTicketUpdate({
    recipientEmails,
    subject: `[Support ${ticket.ticketNumber}] New reply`,
    html: `<p>There is a new reply on ticket ${ticket.ticketNumber}.</p><p><strong>Status:</strong> ${updatedTicket.status}</p>`,
  });

  revalidatePath('/dashboard/support');
  revalidatePath('/dashboard/admin/support');

  return { ok: true, message: 'Reply added' };
}

export async function getSupportQueueAction(filter: SupportQueueFilter = {}) {
  const auth = await requireAppAuth('admin');
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const where: any = {};
  if (filter.status && filter.status !== 'ALL') where.status = filter.status;
  if (filter.priority && filter.priority !== 'ALL') where.priority = filter.priority;
  if (filter.category && filter.category !== 'ALL') where.category = filter.category;

  if (filter.assigned === 'UNASSIGNED') {
    where.assignedToUserId = null;
  } else if (filter.assigned === 'MINE') {
    where.assignedToUserId = dbUser.id;
  }

  const [tickets, summary] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        createdByUser: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
        assignedToUser: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { messages: true, attachments: true } },
      },
    }),
    prisma.supportTicket.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  return {
    tickets: tickets.map(mapTicket),
    summary,
    currentAdminUserId: dbUser.id,
  };
}

export async function getSupportTeamMembersAction() {
  await requireAppAuth('admin');
  const members = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: [{ firstName: 'asc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return members;
}

export async function assignSupportTicketAction(input: UpdateSupportTicketAssignmentInput): Promise<ActionResult> {
  await requireAppAuth('admin');

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      ticketNumber: true,
      createdByUser: { select: { id: true, email: true } },
    },
  });

  if (!ticket) return { ok: false, message: 'Ticket not found' };

  if (input.assignedToUserId) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedToUserId },
      select: { id: true, role: true, email: true },
    });

    if (!assignee || assignee.role !== 'admin') {
      return { ok: false, message: 'Assignee must be an admin/support user' };
    }
  }

  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      assignedToUserId: input.assignedToUserId,
      status: input.assignedToUserId ? 'IN_PROGRESS' : 'OPEN',
    },
  });

  await notifyUsers({
    ticketId: input.ticketId,
    type: 'ticket_assignment',
    message: input.assignedToUserId
      ? `Ticket ${ticket.ticketNumber} has been assigned`
      : `Ticket ${ticket.ticketNumber} has been unassigned`,
    recipientUserIds: [ticket.createdByUser.id, input.assignedToUserId ?? ''],
  });

  if (ticket.createdByUser.email) {
    await emailTicketUpdate({
      recipientEmails: [ticket.createdByUser.email],
      subject: `[Support ${ticket.ticketNumber}] Ticket assignment updated`,
      html: `<p>Your ticket ${ticket.ticketNumber} assignment has been updated.</p>`,
    });
  }

  revalidatePath('/dashboard/admin/support');
  revalidatePath('/dashboard/support');
  return { ok: true, message: 'Ticket assignment updated' };
}

export async function updateSupportTicketStatusAction(input: UpdateSupportTicketStatusInput): Promise<ActionResult> {
  await requireAppAuth('admin');

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    include: {
      createdByUser: { select: { id: true, email: true } },
      assignedToUser: { select: { id: true } },
    },
  });

  if (!ticket) return { ok: false, message: 'Ticket not found' };

  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      status: input.status,
      closedAt: input.status === 'CLOSED' ? new Date() : null,
      firstResponseAt:
        !ticket.firstResponseAt && input.status !== 'OPEN'
          ? new Date()
          : ticket.firstResponseAt,
    },
  });

  await notifyUsers({
    ticketId: input.ticketId,
    type: 'ticket_status',
    message: `Ticket ${ticket.ticketNumber} status changed to ${input.status}`,
    recipientUserIds: [ticket.createdByUser.id, ticket.assignedToUser?.id ?? ''],
  });

  await emailTicketUpdate({
    recipientEmails: [ticket.createdByUser.email ?? ''],
    subject: `[Support ${ticket.ticketNumber}] Status updated`,
    html: `<p>Ticket ${ticket.ticketNumber} status is now <strong>${input.status}</strong>.</p>`,
  });

  revalidatePath('/dashboard/admin/support');
  revalidatePath('/dashboard/support');
  return { ok: true, message: 'Ticket status updated' };
}

export async function updateSupportTicketPriorityAction(input: UpdateSupportTicketPriorityInput): Promise<ActionResult> {
  await requireAppAuth('admin');

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    include: {
      createdByUser: { select: { id: true, email: true } },
    },
  });

  if (!ticket) return { ok: false, message: 'Ticket not found' };

  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      priority: input.priority,
      firstResponseDueAt: addHours(ticket.createdAt, FIRST_RESPONSE_SLA_HOURS[input.priority]),
      resolutionDueAt: addHours(ticket.createdAt, RESOLUTION_SLA_HOURS[input.priority]),
    },
  });

  await notifyUsers({
    ticketId: input.ticketId,
    type: 'ticket_priority',
    message: `Ticket ${ticket.ticketNumber} priority changed to ${input.priority}`,
    recipientUserIds: [ticket.createdByUser.id],
  });

  await emailTicketUpdate({
    recipientEmails: [ticket.createdByUser.email ?? ''],
    subject: `[Support ${ticket.ticketNumber}] Priority updated`,
    html: `<p>Ticket ${ticket.ticketNumber} priority is now <strong>${input.priority}</strong>.</p>`,
  });

  revalidatePath('/dashboard/admin/support');
  revalidatePath('/dashboard/support');
  return { ok: true, message: 'Ticket priority updated' };
}

export async function markSupportNotificationsReadAction(ticketId?: string): Promise<ActionResult> {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  await prisma.supportTicketNotification.updateMany({
    where: {
      userId: dbUser.id,
      isRead: false,
      ...(ticketId ? { ticketId } : {}),
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { ok: true, message: 'Notifications marked as read' };
}

export async function getUnreadSupportNotificationsCountAction() {
  const auth = await requireAppAuth();
  const dbUser = await getDbUserOrThrow(auth.moodleUserId);

  const unreadCount = await prisma.supportTicketNotification.count({
    where: {
      userId: dbUser.id,
      isRead: false,
    },
  });

  return { unreadCount };
}
