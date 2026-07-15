import * as nodemailer from 'nodemailer';
import { ReportedDefect } from '../model/defect';
import { WeeklyReportData } from '../services/weeklyReportService';

const FAULT_NOTIFICATION_EMAIL = 'training@exe-sailing-club.org';

/**
 * Sends a fault notification email when a boat is checked in with reported defects.
 *
 * Requires the following environment variables to be set on the server:
 *   SMTP_HOST   - SMTP server hostname
 *   SMTP_PORT   - SMTP server port (default: 587)
 *   SMTP_USER   - SMTP username
 *   SMTP_PASS   - SMTP password
 *   SMTP_FROM   - From address (e.g. "Boat Manager <noreply@exe-sailing-club.org>")
 *
 * If SMTP_HOST is not set the function logs a warning and returns without sending.
 */
export async function sendFaultNotificationEmail(
    boatName: string,
    defects: ReportedDefect[],
    personName: string,
    engineHours: number
): Promise<void> {
    const smtpHost = process.env['SMTP_HOST'];
    if (!smtpHost) {
        console.warn('SMTP_HOST not set — skipping fault notification email');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env['SMTP_PORT'] ?? 587),
        secure: Number(process.env['SMTP_PORT'] ?? 587) === 465,
        auth: {
            user: process.env['SMTP_USER'],
            pass: process.env['SMTP_PASS'],
        },
    });

    const defectLines = defects.map(d => {
        const detail = d.additionalInfo ? ` — ${d.additionalInfo}` : '';
        return `  • ${d.defectType.name}${detail}`;
    }).join('\n');

    const checkedInAt = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const text = `
A boat has been checked in with reported faults.

Boat:          ${boatName}
Checked in by: ${personName}
Engine hours:  ${engineHours}
Time:          ${checkedInAt}

Reported faults:
${defectLines}

Please review and arrange for maintenance as required.

-- Boat Manager
`.trim();

    const html = `
<p>A boat has been checked in with reported faults.</p>
<table>
  <tr><td><strong>Boat:</strong></td><td>${boatName}</td></tr>
  <tr><td><strong>Checked in by:</strong></td><td>${personName}</td></tr>
  <tr><td><strong>Engine hours:</strong></td><td>${engineHours}</td></tr>
  <tr><td><strong>Time:</strong></td><td>${checkedInAt}</td></tr>
</table>
<p><strong>Reported faults:</strong></p>
<ul>
${defects.map(d => {
    const detail = d.additionalInfo ? ` &mdash; ${d.additionalInfo}` : '';
    return `  <li>${d.defectType.name}${detail}</li>`;
}).join('\n')}
</ul>
<p>Please review and arrange for maintenance as required.</p>
<hr>
<small>Boat Manager</small>
`.trim();

    await transporter.sendMail({
        from: process.env['SMTP_FROM'] ?? `"Boat Manager" <noreply@exe-sailing-club.org>`,
        to: FAULT_NOTIFICATION_EMAIL,
        subject: `Boat fault reported: ${boatName}`,
        text,
        html,
    });

    console.log(`Fault notification email sent to ${FAULT_NOTIFICATION_EMAIL} for boat ${boatName}`);
}

export async function sendNewFaultNotificationEmail(
    boatName: string,
    defects: ReportedDefect[],
    personName: string,
    engineHours: number,
    recipients: string[]
): Promise<void> {
    const smtpHost = process.env['SMTP_HOST'];
    if (!smtpHost) {
        console.warn('SMTP_HOST not set — skipping new-fault notification email');
        return;
    }
    if (!recipients || recipients.length === 0) {
        console.warn('sendNewFaultNotificationEmail: no recipients — skipping');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env['SMTP_PORT'] ?? 587),
        secure: Number(process.env['SMTP_PORT'] ?? 587) === 465,
        auth: {
            user: process.env['SMTP_USER'],
            pass: process.env['SMTP_PASS'],
        },
    });

    const defectLines = defects.map(d => {
        const detail = d.additionalInfo ? ` — ${d.additionalInfo}` : '';
        return `  • ${d.defectType.name}${detail}`;
    }).join('\n');

    const checkedInAt = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const text = `
A new fault has been reported on a boat.

Boat:          ${boatName}
Checked in by: ${personName}
Engine hours:  ${engineHours}
Time:          ${checkedInAt}

New faults (not previously recorded):
${defectLines}

Please review and arrange for maintenance as required.

-- Boat Manager
`.trim();

    const html = `
<p>A new fault has been reported on a boat.</p>
<table>
  <tr><td><strong>Boat:</strong></td><td>${boatName}</td></tr>
  <tr><td><strong>Checked in by:</strong></td><td>${personName}</td></tr>
  <tr><td><strong>Engine hours:</strong></td><td>${engineHours}</td></tr>
  <tr><td><strong>Time:</strong></td><td>${checkedInAt}</td></tr>
</table>
<p><strong>New faults (not previously recorded):</strong></p>
<ul>
${defects.map(d => {
    const detail = d.additionalInfo ? ` &mdash; ${d.additionalInfo}` : '';
    return `  <li>${d.defectType.name}${detail}</li>`;
}).join('\n')}
</ul>
<p>Please review and arrange for maintenance as required.</p>
<hr>
<small>Boat Manager</small>
`.trim();

    await transporter.sendMail({
        from: process.env['SMTP_FROM'] ?? `"Boat Manager" <noreply@exe-sailing-club.org>`,
        to: recipients.join(', '),
        subject: `New boat fault reported: ${boatName}`,
        text,
        html,
    });

    console.log(`New-fault notification email sent to ${recipients.join(', ')} for boat ${boatName}`);
}

function fmt(n: number): string {
    return n.toFixed(1);
}

function tableRows(map: Map<string, number>, nameById?: Map<string, string>): string {
    const rows: string[] = [];
    for (const [key, hours] of map.entries()) {
        const label = nameById ? (nameById.get(key) ?? key) : key;
        rows.push(`  <tr><td>${label}</td><td style="text-align:right">${fmt(hours)}</td></tr>`);
    }
    return rows.join('\n');
}

export async function sendWeeklyReport(data: WeeklyReportData, recipients: string[]): Promise<void> {
    const smtpHost = process.env['SMTP_HOST'];
    if (!smtpHost) {
        console.warn('SMTP_HOST not set — skipping weekly report email');
        return;
    }
    if (!recipients || recipients.length === 0) {
        console.warn('sendWeeklyReport: no recipients — skipping');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env['SMTP_PORT'] ?? 587),
        secure: Number(process.env['SMTP_PORT'] ?? 587) === 465,
        auth: {
            user: process.env['SMTP_USER'],
            pass: process.env['SMTP_PASS'],
        },
    });

    const weekLabel = `${data.weekStart.toLocaleDateString('en-GB')} – ${data.weekEnd.toLocaleDateString('en-GB')}`;
    const yearLabel = `${data.yearStart.getFullYear()}`;

    const faultRows = data.boatFaults.length === 0
        ? '<tr><td colspan="2">No outstanding faults</td></tr>'
        : data.boatFaults.map(bf => {
            const defectList = bf.defects.map(d => {
                const detail = d.additionalInfo ? ` — ${d.additionalInfo}` : '';
                return `${d.defectType.name}${detail}`;
            }).join('; ');
            return `  <tr><td>${bf.boatName}</td><td>${defectList}</td></tr>`;
        }).join('\n');

    const html = `
<h2>Weekly Boat Usage Report</h2>
<p>Week: <strong>${weekLabel}</strong></p>

<h3>1. Engine Hours This Year (${yearLabel})</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Boat</th><th>Hours</th></tr>
${tableRows(data.yearlyHoursByBoat, data.boatNameById)}
  <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${fmt(data.yearlyTotalHours)}</strong></td></tr>
</table>

<h3>2. Engine Hours This Week (${weekLabel})</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Boat</th><th>Hours</th></tr>
${tableRows(data.weeklyHoursByBoat, data.boatNameById)}
  <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${fmt(data.weeklyTotalHours)}</strong></td></tr>
</table>

<h3>3. Engine Hours This Year by Checkout Reason (${yearLabel})</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Reason</th><th>Hours</th></tr>
${tableRows(data.yearlyHoursByReason)}
</table>

<h3>4. Engine Hours This Week by Checkout Reason</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Reason</th><th>Hours</th></tr>
${tableRows(data.weeklyHoursByReason)}
</table>

<h3>5. Outstanding Faults</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Boat</th><th>Faults</th></tr>
${faultRows}
</table>

<hr>
<small>Boat Manager — weekly report</small>
`.trim();

    // Build CSV attachment
    const csvLines: string[] = [];
    csvLines.push(`Engine Hours This Year (${yearLabel})`);
    csvLines.push('Boat,Hours');
    for (const [id, hours] of data.yearlyHoursByBoat.entries()) {
        const name = data.boatNameById.get(id) ?? id;
        csvLines.push(`"${name}",${fmt(hours)}`);
    }
    csvLines.push(`Total,${fmt(data.yearlyTotalHours)}`);
    csvLines.push('');
    csvLines.push(`Engine Hours This Week (${weekLabel})`);
    csvLines.push('Boat,Hours');
    for (const [id, hours] of data.weeklyHoursByBoat.entries()) {
        const name = data.boatNameById.get(id) ?? id;
        csvLines.push(`"${name}",${fmt(hours)}`);
    }
    csvLines.push(`Total,${fmt(data.weeklyTotalHours)}`);
    csvLines.push('');
    csvLines.push(`Engine Hours This Year by Reason (${yearLabel})`);
    csvLines.push('Reason,Hours');
    for (const [reason, hours] of data.yearlyHoursByReason.entries()) {
        csvLines.push(`"${reason}",${fmt(hours)}`);
    }
    csvLines.push('');
    csvLines.push('Engine Hours This Week by Reason');
    csvLines.push('Reason,Hours');
    for (const [reason, hours] of data.weeklyHoursByReason.entries()) {
        csvLines.push(`"${reason}",${fmt(hours)}`);
    }
    csvLines.push('');
    csvLines.push('Outstanding Faults');
    csvLines.push('Boat,Faults');
    if (data.boatFaults.length === 0) {
        csvLines.push('No outstanding faults,');
    } else {
        for (const bf of data.boatFaults) {
            const faults = bf.defects.map(d => {
                const detail = d.additionalInfo ? ` - ${d.additionalInfo}` : '';
                return `${d.defectType.name}${detail}`;
            }).join('; ');
            csvLines.push(`"${bf.boatName}","${faults}"`);
        }
    }
    const csv = csvLines.join('\n');
    const csvFilename = `boat-usage-report-${data.weekEnd.toISOString().slice(0, 10)}.csv`;

    await transporter.sendMail({
        from: process.env['SMTP_FROM'] ?? `"Boat Manager" <noreply@exe-sailing-club.org>`,
        to: recipients.join(', '),
        subject: `Weekly boat usage report — ${weekLabel}`,
        html,
        attachments: [
            { filename: csvFilename, content: csv, contentType: 'text/csv' },
        ],
    });

    console.log(`Weekly report sent to ${recipients.join(', ')}`);
}
