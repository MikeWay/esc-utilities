import cron from 'node-cron';
import { dao } from '../model/dao';
import { EngineHours } from '../model/EngineHours';
import { ReportedDefect } from '../model/defect';
import { Config } from '../model/Config';
import { sendWeeklyReport } from '../email/emailService';

export interface WeeklyReportData {
    weekStart: Date;
    weekEnd: Date;
    yearStart: Date;
    yearlyHoursByBoat: Map<string, number>;   // boatId → total hours this year
    yearlyTotalHours: number;
    yearlyHoursByReason: Map<string, number>; // reason → total hours this year
    weeklyHoursByBoat: Map<string, number>;   // boatId → total hours this week
    weeklyTotalHours: number;
    weeklyHoursByReason: Map<string, number>; // reason → total hours this week
    boatFaults: Array<{ boatName: string; defects: ReportedDefect[] }>;
    boatNameById: Map<string, string>;        // boatId → boatName
}

function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
    // Days since last Monday (treating Sunday as 7)
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    // Start of this week's Monday
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    thisMonday.setDate(now.getDate() - daysSinceMonday);
    // Previous Monday = thisMonday - 7 days
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - 7);
    // Previous Sunday 23:59:59.999 = thisMonday - 1ms
    const weekEnd = new Date(thisMonday.getTime() - 1);
    return { weekStart, weekEnd };
}

export async function generateWeeklyReportData(options?: { manualTrigger?: boolean }): Promise<WeeklyReportData> {
    let weekStart: Date;
    let weekEnd: Date;
    if (options?.manualTrigger) {
        // Manual trigger: last 7 days from now
        weekEnd = new Date();
        weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        weekStart.setHours(0, 0, 0, 0);
    } else {
        ({ weekStart, weekEnd } = getWeekBounds());
    }
    const yearStart = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);

    // Load all engine hours in one scan
    const allEngineHours: EngineHours[] = await dao.engineHoursManager.loadAllEngineHoursForAllBoats();

    // Load all boats for id→name mapping
    const boats = await dao.boatManager.listBoats();
    const boatNameById = new Map<string, string>();
    for (const boat of boats) {
        boatNameById.set(boat.id, boat.name);
    }

    const yearlyHoursByBoat = new Map<string, number>();
    const yearlyHoursByReason = new Map<string, number>();
    const weeklyHoursByBoat = new Map<string, number>();
    const weeklyHoursByReason = new Map<string, number>();

    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekEnd.getTime();
    const yearStartMs = yearStart.getTime();

    for (const eh of allEngineHours) {
        const ts = eh.timestamp;

        if (ts >= yearStartMs) {
            const prev = yearlyHoursByBoat.get(eh.boatId) ?? 0;
            yearlyHoursByBoat.set(eh.boatId, prev + eh.hours);

            const reason = eh.reason || 'Unknown';
            const prevReason = yearlyHoursByReason.get(reason) ?? 0;
            yearlyHoursByReason.set(reason, prevReason + eh.hours);
        }

        if (ts >= weekStartMs && ts <= weekEndMs) {
            const prevBoat = weeklyHoursByBoat.get(eh.boatId) ?? 0;
            weeklyHoursByBoat.set(eh.boatId, prevBoat + eh.hours);

            const reason = eh.reason || 'Unknown';
            const prevReason = weeklyHoursByReason.get(reason) ?? 0;
            weeklyHoursByReason.set(reason, prevReason + eh.hours);
        }
    }

    const yearlyTotalHours = Array.from(yearlyHoursByBoat.values()).reduce((s, h) => s + h, 0);
    const weeklyTotalHours = Array.from(weeklyHoursByBoat.values()).reduce((s, h) => s + h, 0);

    // Outstanding faults
    const boatsWithIssues = await dao.identifyBoatsWithIssues();
    const boatFaults: Array<{ boatName: string; defects: ReportedDefect[] }> = [];
    for (const boat of boatsWithIssues) {
        const defectsForBoat = await dao.defectManager.loadDefectsForBoat(boat.id);
        if (defectsForBoat && defectsForBoat.hasDefects()) {
            boatFaults.push({
                boatName: boat.name,
                defects: defectsForBoat.reportedDefects,
            });
        }
    }

    return {
        weekStart,
        weekEnd,
        yearStart,
        yearlyHoursByBoat,
        yearlyTotalHours,
        yearlyHoursByReason,
        weeklyHoursByBoat,
        weeklyTotalHours,
        weeklyHoursByReason,
        boatFaults,
        boatNameById,
    };
}

export function scheduleWeeklyReport(): void {
    const recipients: string[] = Config.getInstance().get('weekly_report_recipients') ?? [];
    if (!recipients || recipients.length === 0) {
        console.warn('weeklyReport: no recipients configured in weekly_report_recipients — report will not be sent automatically');
    }

    // Fire at 07:00 every Monday
    cron.schedule('0 7 * * 1', async () => {
        console.log('weeklyReport: generating scheduled weekly report');
        try {
            const data = await generateWeeklyReportData();
            if (recipients.length > 0) {
                await sendWeeklyReport(data, recipients);
            } else {
                console.warn('weeklyReport: skipping send — no recipients configured');
            }
        } catch (err) {
            console.error('weeklyReport: error generating or sending report:', err);
        }
    });

    console.log('weeklyReport: scheduled for 07:00 every Monday');
}
