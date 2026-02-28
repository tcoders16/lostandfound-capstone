// src/services/email/emailService.ts
import nodemailer from "nodemailer";

// Use environment variables for email config
// For dev/demo: supports Gmail SMTP, SendGrid SMTP, or any SMTP server
const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST    || "smtp.gmail.com",
  port:     Number(process.env.SMTP_PORT || 587),
  secure:   process.env.SMTP_SECURE  === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM_NAME    = process.env.EMAIL_FROM_NAME || "GO Transit Lost & Found";
const FROM_ADDRESS = process.env.SMTP_USER       || "lostfound@gotransit.com";

export interface MatchApprovedEmailData {
  riderName:        string;
  riderEmail:       string;
  claimId:          string;
  foundDescription: string;
  foundLocation?:   string;
  matchScore:       number;
  adminNotes?:      string;
  collectionToken:  string;  // GOT-YYYYMMDD-XXXXXXXX-CC — required for pickup
}

/**
 * Send the "your item was found!" notification email to the rider.
 * Includes the collection token prominently as a digital pickup pass.
 */
export async function sendMatchApprovedEmail(data: MatchApprovedEmailData): Promise<void> {
  const matchPct    = Math.round(data.matchScore * 100);
  const expiryDate  = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryStr   = expiryDate.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Lost Item Has Been Found — Collection Pass</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Inter','Segoe UI',sans-serif;color:#1c2b39;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.12);">

          <!-- Header -->
          <tr>
            <td style="background:#1c2b39;padding:28px 32px;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#006341;border-radius:8px;padding:8px 14px;">
                      <span style="color:#fff;font-weight:800;font-size:16px;letter-spacing:-0.5px;font-family:Georgia,serif;">GO</span>
                    </td>
                    <td style="padding-left:14px;">
                      <div style="color:#fff;font-weight:700;font-size:16px;letter-spacing:-0.3px;">Lost &amp; Found</div>
                      <div style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px;">GO Transit · Metrolinx</div>
                    </td>
                  </tr></table>
                </td>
                <td align="right">
                  <span style="color:rgba(255,255,255,.35);font-size:11px;font-family:monospace;">${data.claimId}</span>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Green accent bar -->
          <tr><td style="height:5px;background:linear-gradient(90deg,#006341,#00a76f,#00d492);"></td></tr>

          <!-- Congratulations banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#e8f5ed,#f0faf4);padding:28px 32px 20px;text-align:center;border-bottom:1px solid #d1ead9;">
              <div style="font-size:40px;margin-bottom:8px;">&#x1F4E6;</div>
              <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#006341;letter-spacing:-0.5px;">
                Your Item Has Been Found!
              </h1>
              <p style="margin:0;font-size:15px;color:#2d6a4f;line-height:1.6;">
                Great news, <strong>${data.riderName}</strong>. Our staff have confirmed a match with <strong>${matchPct}% confidence</strong> and your item is ready for collection.
              </p>
            </td>
          </tr>

          <!-- ═══ COLLECTION PASS ═══ -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#546478;">
                Your Collection Pass
              </p>
              <!-- Token card with dashed border (ticket style) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed #006341;border-radius:14px;background:#f0faf4;overflow:hidden;">
                <tr>
                  <!-- Left colour strip -->
                  <td width="8" style="background:#006341;">&nbsp;</td>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#2d6a4f;">
                      GO Transit Lost &amp; Found — Official Collection Token
                    </p>
                    <p style="margin:0 0 16px;font-size:13px;color:#546478;line-height:1.5;">
                      Present this token at the Lost &amp; Found counter along with a valid government-issued photo ID.
                    </p>
                    <!-- Token value -->
                    <div style="background:#1c2b39;border-radius:10px;padding:14px 20px;display:inline-block;">
                      <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1.5px;">Collection Token</p>
                      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#00d492;letter-spacing:3px;">
                        ${data.collectionToken}
                      </p>
                    </div>
                    <p style="margin:12px 0 0;font-size:12px;color:#d97706;">
                      <strong>Expires:</strong> ${expiryStr} — Items held for 30 days from approval date.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">

              <!-- Matched item card -->
              <div style="background:#e8f4ef;border:1px solid #c3e2d4;border-radius:10px;padding:18px;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#006341;">Item Matched</p>
                <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1c2b39;">${data.foundDescription}</p>
                ${data.foundLocation ? `<p style="margin:0;font-size:13px;color:#546478;">Found at: ${data.foundLocation}</p>` : ""}
              </div>

              ${data.adminNotes ? `
              <div style="background:#fef9ec;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:20px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#d97706;">Note from staff</p>
                <p style="margin:0;font-size:14px;color:#1c2b39;">${data.adminNotes}</p>
              </div>
              ` : ""}

              <!-- Steps -->
              <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:#1c2b39;">How to collect your item</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ["1", "Save or print this email — you'll need the Collection Token above"],
                  ["2", "Bring a valid government-issued photo ID (driver's licence, passport, etc.)"],
                  ["3", "Visit the GO Transit Lost &amp; Found office during business hours (Mon–Fri, 8 AM–6 PM)"],
                  ["4", "Show your Collection Token and ID at the counter to claim your item"],
                ].map(([n, text]) => `
                <tr>
                  <td style="padding:7px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="background:#006341;color:#fff;border-radius:50%;width:24px;height:24px;text-align:center;font-size:11px;font-weight:700;line-height:24px;vertical-align:middle;flex-shrink:0;">${n}</td>
                      <td style="padding-left:12px;font-size:13px;color:#546478;line-height:1.55;">${text}</td>
                    </tr></table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- Warning box -->
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-top:20px;">
                <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.6;">
                  <strong>Important:</strong> This token is valid for one use only and expires on ${expiryStr}. Do not share this email. You will be asked to show photo ID matching your claim details.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-top:28px;">
                <a href="https://www.gotransit.com/en/lost-found"
                   style="display:inline-block;background:#006341;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.3px;">
                  GO Transit Lost &amp; Found Info
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f6f7;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#8695a4;text-align:center;line-height:1.7;">
                © ${new Date().getFullYear()} Metrolinx / GO Transit. All rights reserved.<br/>
                This email was sent because you filed a lost item report with GO Transit Lost &amp; Found.<br/>
                Report reference: <span style="font-family:monospace;">${data.claimId}</span> &nbsp;|&nbsp; Token: <span style="font-family:monospace;">${data.collectionToken}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      data.riderEmail,
    subject: `Your lost item has been found — Collection Token: ${data.collectionToken}`,
    html,
    text: [
      `Hi ${data.riderName},`,
      ``,
      `Great news! Your lost item has been found and confirmed with ${matchPct}% confidence.`,
      ``,
      `===== YOUR COLLECTION TOKEN =====`,
      `${data.collectionToken}`,
      `=================================`,
      ``,
      `Item matched: ${data.foundDescription}`,
      data.foundLocation ? `Found at: ${data.foundLocation}` : "",
      data.adminNotes    ? `Staff note: ${data.adminNotes}` : "",
      ``,
      `HOW TO COLLECT YOUR ITEM:`,
      `1. Save this email — you'll need the Collection Token above`,
      `2. Bring a valid government-issued photo ID`,
      `3. Visit the GO Transit Lost & Found office (Mon–Fri, 8 AM–6 PM)`,
      `4. Show your token and ID at the counter`,
      ``,
      `This token expires on ${expiryStr}. Items are held for 30 days from approval.`,
      ``,
      `Report reference: ${data.claimId}`,
      ``,
      `— GO Transit Lost & Found team`,
      `1-877-216-2867 | gotransit.com/en/lost-found`,
    ].filter(l => l !== undefined).join("\n"),
  });
}

/**
 * Send "match declined" email when a match was rejected or declined.
 */
export async function sendMatchDeclinedEmail(data: {
  riderName: string;
  riderEmail: string;
  claimId: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lost Item Status Update</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:'Inter','Segoe UI',sans-serif;color:#1c2b39;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1c2b39;padding:28px 32px;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#006341;border-radius:6px;padding:6px 12px;margin-right:12px;">
                      <span style="color:#fff;font-weight:800;font-size:14px;letter-spacing:-0.5px;">GO</span>
                    </td>
                    <td style="padding-left:12px;">
                      <div style="color:#fff;font-weight:700;font-size:15px;">Lost &amp; Found</div>
                      <div style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">GO Transit</div>
                    </td>
                  </tr></table>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Orange accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#d97706,#f59e0b);"></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#1c2b39;letter-spacing:-0.5px;">
                Lost Item Status Update
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#546478;line-height:1.6;">
                Thank you for reporting your lost item to GO Transit Lost & Found. Unfortunately, we were unable to confirm a match for your item.
              </p>

              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  Reference: <code style="font-family:monospace;color:#d97706;font-weight:600;">${data.claimId}</code>
                </p>
              </div>

              <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#1c2b39;">What you can do</h2>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#546478;line-height:1.8;">
                <li style="margin-bottom:6px;">Check the GO Transit Lost & Found office in person</li>
                <li style="margin-bottom:6px;">Call us at 1-877-216-2867 to speak with a staff member</li>
                <li>Submit another report if you have additional details about your item</li>
              </ul>

              <p style="margin:0;font-size:13px;color:#546478;">
                Items are typically held for 30 days from the date found. Please act quickly if you believe your item may be with us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f6f7;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#8695a4;text-align:center;line-height:1.6;">
                © ${new Date().getFullYear()} Metrolinx / GO Transit. All rights reserved.<br/>
                Reference: ${data.claimId}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      data.riderEmail,
    subject: `Status update on your lost item report — GO Transit Lost & Found`,
    html,
    text: `Hi ${data.riderName},\n\nWe were unable to confirm a match for your lost item. Please contact us at 1-877-216-2867 or visit the Lost & Found office.\n\nReference: ${data.claimId}\n\n— GO Transit Lost & Found team`,
  });
}

/**
 * Send "conflict winner" email when a claimant's item is confirmed (won conflict resolution).
 */
export async function sendConflictWinnerEmail(data: {
  riderName: string;
  riderEmail: string;
  claimId: string;
  foundDescription: string;
  foundLocation: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Lost Item Has Been Found</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:'Inter','Segoe UI',sans-serif;color:#1c2b39;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1c2b39;padding:28px 32px;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#006341;border-radius:6px;padding:6px 12px;margin-right:12px;">
                      <span style="color:#fff;font-weight:800;font-size:14px;letter-spacing:-0.5px;">GO</span>
                    </td>
                    <td style="padding-left:12px;">
                      <div style="color:#fff;font-weight:700;font-size:15px;">Lost &amp; Found</div>
                      <div style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">GO Transit</div>
                    </td>
                  </tr></table>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Green accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#006341,#00a76f);"></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 6px;font-size:28px;font-weight:800;color:#006341;letter-spacing:-0.5px;">
                Your Item Has Been Found!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#546478;line-height:1.6;">
                Great news, ${data.riderName}! We have confirmed and verified your lost item. Our team is holding it safely for you.
              </p>

              <!-- Match card -->
              <div style="background:#e8f4ef;border:1px solid #c3e2d4;border-radius:10px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#006341;">Your Item</p>
                <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1c2b39;">${data.foundDescription}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#546478;">📍 Currently at: ${data.foundLocation}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#546478;">Reference: <code style="font-family:monospace;color:#006341;">${data.claimId}</code></p>
              </div>

              <!-- Next steps -->
              <h2 style="font-size:16px;font-weight:700;margin:0 0 14px;color:#1c2b39;">How to claim your item</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ["1", "Bring a valid government-issued photo ID"],
                  ["2", "Visit the GO Transit Lost & Found office during business hours"],
                  ["3", "Quote your reference number: " + data.claimId],
                ].map(([n, text]) => `
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="background:#006341;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;font-size:11px;font-weight:700;line-height:22px;">${n}</td>
                      <td style="padding-left:10px;font-size:13px;color:#546478;line-height:1.5;">${text}</td>
                    </tr></table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- Important note -->
              <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:8px;padding:12px;margin-top:20px;">
                <p style="margin:0;font-size:12px;color:#065f46;">
                  <strong>Note:</strong> Items are held for 30 days from the date found. Please come pick it up as soon as possible.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-top:28px;">
                <a href="https://www.gotransit.com/en/lost-found"
                   style="display:inline-block;background:#006341;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
                  GO Transit Lost & Found Info
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f6f7;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#8695a4;text-align:center;line-height:1.6;">
                © ${new Date().getFullYear()} Metrolinx / GO Transit. All rights reserved.<br/>
                Reference: ${data.claimId}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      data.riderEmail,
    subject: `Your item has been found! — GO Transit Lost & Found`,
    html,
    text: `Hi ${data.riderName},\n\nGreat news! We've confirmed your lost item.\n\n${data.foundDescription}\nLocation: ${data.foundLocation}\nReference: ${data.claimId}\n\nPlease bring a valid photo ID to pick it up.\n\n— GO Transit Lost & Found team`,
  });
}

/**
 * Send "conflict loser" email when a claimant's item is not confirmed (lost conflict resolution).
 */
export async function sendConflictLoserEmail(data: {
  riderName: string;
  riderEmail: string;
  claimId: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lost Item Status Update</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:'Inter','Segoe UI',sans-serif;color:#1c2b39;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1c2b39;padding:28px 32px;">
              <table width="100%"><tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#006341;border-radius:6px;padding:6px 12px;margin-right:12px;">
                      <span style="color:#fff;font-weight:800;font-size:14px;letter-spacing:-0.5px;">GO</span>
                    </td>
                    <td style="padding-left:12px;">
                      <div style="color:#fff;font-weight:700;font-size:15px;">Lost &amp; Found</div>
                      <div style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">GO Transit</div>
                    </td>
                  </tr></table>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Orange accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#d97706,#f59e0b);"></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#1c2b39;letter-spacing:-0.5px;">
                Lost Item Status Update
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#546478;line-height:1.6;">
                We're sorry, but we were unable to confirm your lost item at this time. While we found a similar item, another claimant was able to provide stronger proof of ownership.
              </p>

              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  Reference: <code style="font-family:monospace;color:#d97706;font-weight:600;">${data.claimId}</code>
                </p>
              </div>

              <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#1c2b39;">What you can do</h2>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#546478;line-height:1.8;">
                <li style="margin-bottom:6px;">Visit the GO Transit Lost & Found office to speak with our staff</li>
                <li style="margin-bottom:6px;">Call us at 1-877-216-2867 if you have additional questions</li>
                <li>Submit another report with more specific details if applicable</li>
              </ul>

              <p style="margin:0;font-size:13px;color:#546478;line-height:1.6;">
                We appreciate you reporting your lost item and apologize we couldn't confirm a match. Our team will continue to assist you in any way we can.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f6f7;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#8695a4;text-align:center;line-height:1.6;">
                © ${new Date().getFullYear()} Metrolinx / GO Transit. All rights reserved.<br/>
                Reference: ${data.claimId}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      data.riderEmail,
    subject: `Lost item status update — GO Transit Lost & Found`,
    html,
    text: `Hi ${data.riderName},\n\nWe were unable to confirm your lost item. Another claimant provided stronger proof of ownership for a similar item.\n\nPlease visit the Lost & Found office or call us for assistance.\n\nReference: ${data.claimId}\n\n— GO Transit Lost & Found team`,
  });
}
