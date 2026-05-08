import { Resend } from "resend";

type SendBookingConfirmationEmailsParams = {
  recipientEmails: string[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  start: Date;
  end: Date;
  paymentReference: string;
  meetLink?: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
  };
}

function formatUtcDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function isResendConfigured() {
  return getResendConfig() !== null;
}

export async function sendBookingConfirmationEmails({
  recipientEmails,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  start,
  end,
  paymentReference,
  meetLink,
}: SendBookingConfirmationEmailsParams) {
  const config = getResendConfig();

  if (!config) {
    throw new Error("Resend is not configured.");
  }

  const resend = new Resend(config.apiKey);
  const dedupedRecipients = [...new Set(recipientEmails.filter((email) => email.trim().length > 0))];

  if (dedupedRecipients.length === 0) {
    return;
  }

  const startLabel = formatUtcDateTime(start);
  const endLabel = formatUtcDateTime(end);
  const meetLinkSection = meetLink
    ? `<p style="margin:0 0 12px;">Meet link: <a href="${meetLink}">${meetLink}</a></p>`
    : "";
  const textLines = [
    "Hello,",
    "",
    "A booking has been confirmed.",
    "",
    `Service: ${serviceName}`,
    `Client: ${customerName}`,
    `Client email: ${customerEmail}`,
    `Client phone: ${customerPhone}`,
    `Start: ${startLabel}`,
    `End: ${endLabel}`,
    `Payment reference: ${paymentReference}`,
  ];

  if (meetLink) {
    textLines.push(`Meet link: ${meetLink}`);
  }

  await resend.emails.send({
    from: config.fromEmail,
    to: dedupedRecipients,
    subject: `Booking confirmed: ${serviceName}`,
    text: textLines.join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;">
        <h2 style="margin-bottom:16px;">Booking confirmed</h2>
        <p style="margin:0 0 12px;">A booking has been confirmed with the details below.</p>
        <p style="margin:0 0 12px;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin:0 0 12px;"><strong>Client:</strong> ${customerName}</p>
        <p style="margin:0 0 12px;"><strong>Client email:</strong> ${customerEmail}</p>
        <p style="margin:0 0 12px;"><strong>Client phone:</strong> ${customerPhone}</p>
        <p style="margin:0 0 12px;"><strong>Start:</strong> ${startLabel}</p>
        <p style="margin:0 0 12px;"><strong>End:</strong> ${endLabel}</p>
        <p style="margin:0 0 12px;"><strong>Payment reference:</strong> ${paymentReference}</p>
        ${meetLinkSection}
      </div>
    `,
  });
}