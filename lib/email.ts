// ───────────────────────────────────────────────────────────────
// Email helper — sends transactional emails via the Resend REST API.
// No SDK dependency; uses fetch.
//
// Required env vars (set in Vercel → Project Settings → Environment Variables):
//   RESEND_API_KEY              — from https://resend.com/api-keys
//   INTAKE_NOTIFICATION_TO      — comma-separated recipients e.g. "alice@co.com,bob@co.com"
//   INTAKE_NOTIFICATION_FROM    — verified sender e.g. "QMS Intake <notifications@yourdomain.com>"
//                                  (use "onboarding@resend.dev" for initial testing)
//   APP_URL (optional)          — base URL used for "View in app" link, e.g. "https://qms.yourco.com"
// ───────────────────────────────────────────────────────────────

export type EmailPayload = {
  to: string[]
  from: string
  subject: string
  html: string
  reply_to?: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  if (!payload.to.length) {
    return { ok: false, error: 'No recipients' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:     payload.from,
        to:       payload.to,
        subject:  payload.subject,
        html:     payload.html,
        reply_to: payload.reply_to,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data?.message || `HTTP ${res.status}` }
    }
    return { ok: true, id: data?.id || '' }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

// ── Intake notification ────────────────────────────────────────

export type IntakeNotificationInput = {
  type:           'return' | 'exchange' | 'msm'
  reference:      string
  submitterName:  string
  patientId:      string
  date:           string
  poNumber?:      string | null
  product?:       string | null
  hcpcs?:         string | null
  manufacturer?:  string | null
  updatedProduct?: string | null
  products?:      string[]
  notes?:         string | null
}

const TYPE_LABEL: Record<IntakeNotificationInput['type'], string> = {
  return:   'Return',
  exchange: 'Exchange',
  msm:      'MSM Device',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:8px 14px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#1C2B4A;">${escapeHtml(value)}</td>
    </tr>`
}

function notesBlock(notes?: string | null): string {
  if (!notes || !notes.trim()) return ''
  return `
    <div style="margin-top:18px;">
      <p style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Notes</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.5;">${escapeHtml(notes)}</div>
    </div>`
}

export function buildIntakeNotificationEmail(input: IntakeNotificationInput): { subject: string; html: string } {
  const typeLabel = TYPE_LABEL[input.type]
  const subject = `[QMS] New ${typeLabel} request — ${input.reference}`

  const appUrl = process.env.APP_URL?.replace(/\/+$/, '') || ''
  const logisticsLink = appUrl ? `${appUrl}/logistics` : ''

  const productCell = input.type === 'msm' && input.products?.length
    ? input.products.map(p => `<span style="display:inline-block;font-size:11px;font-weight:600;color:#1D4ED8;background:#EFF6FF;padding:3px 9px;border-radius:10px;border:1px solid #BFDBFE;margin:1px 3px 1px 0;">${escapeHtml(p)}</span>`).join('')
    : null

  const productRow = productCell
    ? `<tr>
        <td style="padding:8px 14px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;width:140px;vertical-align:top;">Products</td>
        <td style="padding:8px 14px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#1C2B4A;">${productCell}</td>
      </tr>`
    : row('Product', input.product)

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#F4F6FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;">
      <tr>
        <td style="padding:22px 28px 18px;background:linear-gradient(135deg,#6B8CC7,#1C2B4A);">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.1em;">New Field Submission</p>
          <h1 style="margin:0;font-size:20px;color:#fff;font-family:Georgia,serif;font-weight:700;">${escapeHtml(typeLabel)} Request</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9);font-family:monospace;letter-spacing:0.04em;">Ref: ${escapeHtml(input.reference)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
            ${row('Submitted by', input.submitterName)}
            ${row('Patient ID', input.patientId)}
            ${row('Date', input.date)}
            ${input.type !== 'msm' ? row('PO Number', input.poNumber) : ''}
            ${productRow}
            ${input.type !== 'msm' ? row('HCPCS', input.hcpcs) : ''}
            ${input.type !== 'msm' ? row('Manufacturer', input.manufacturer) : ''}
            ${input.type === 'exchange' ? row('Replacement', input.updatedProduct) : ''}
          </table>
          ${notesBlock(input.notes)}
          ${logisticsLink ? `
            <div style="margin-top:24px;text-align:center;">
              <a href="${logisticsLink}" style="display:inline-block;padding:11px 26px;background:linear-gradient(135deg,#6B8CC7,#1C2B4A);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">View in QMS →</a>
            </div>` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 28px 22px;border-top:1px solid #F1F5F9;">
          <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">This is an automated notification from the QMS intake form.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html }
}

export function getNotificationRecipients(): string[] {
  const raw = process.env.INTAKE_NOTIFICATION_TO || ''
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && /@/.test(s))
}

export function getNotificationFrom(): string {
  return process.env.INTAKE_NOTIFICATION_FROM || 'QMS Intake <onboarding@resend.dev>'
}
