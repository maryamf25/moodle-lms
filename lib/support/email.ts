interface TicketEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendSupportTicketEmail(payload: TicketEmailPayload): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SUPPORT_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.log('[support][email] skipped (missing RESEND_API_KEY or SUPPORT_FROM_EMAIL)', {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[support][email] failed', {
        status: response.status,
        body: errorText,
      });
    }
  } catch (error) {
    console.error('[support][email] unexpected error', error);
  }
}
