# Plan: Weekly Usage Report Admin Page

## Requirements Summary

Add a new admin page at `/admin/usageReport` showing all boat check-outs and check-ins from the last 7 days, including who used each boat.

**In scope:**
- New route, controller method, and EJS view
- Data sourced from the existing `Rib_Logs_Test` DynamoDB log table via `LogManager.listLogEntries()`
- Filter to last 7 days in the controller (consistent with existing codebase pattern — no new DynamoDB queries needed)
- Link added to the admin home page

**Out of scope:**
- Email delivery
- Date picker / custom date ranges
- Engine hours or defect data

---

## Acceptance Criteria

1. `GET /admin/usageReport` returns 200 for authenticated admin users and 403 (throws NOT-ADMIN) for unauthenticated requests
2. The page displays a table with columns: Boat Name, Checked Out By, Check-Out Time, Check-In Time, Duration, Reason
3. Rows are filtered to the last 7 days (from 00:00:00 seven days ago to now), based on `checkOutDateTime`
4. Rows are sorted by check-out time, most recent first
5. If no entries exist in the period, a "No usage in the last 7 days" message is shown
6. The admin home page (`/admin`) contains a link to `/admin/usageReport`
7. Duration is displayed as hours and minutes (e.g. "2h 15m"); if boat is still checked out, show "In use"
8. The page heading states the date range covered (e.g. "Usage: 29 Apr – 6 May 2026")

---

## Implementation Steps

### Step 1 — Add `getLogEntriesForPeriod` to `LogManager`
**File**: `server/src/model/LogManager.ts`

Add a method `getLogEntriesForDateRange(fromMs: number, toMs: number): Promise<LogEntry[]>` that:
- Calls `listLogEntries()` (existing full-scan method)
- Filters results where `checkOutDateTime >= fromMs && checkOutDateTime <= toMs`
- Returns sorted descending by `checkOutDateTime`

This avoids introducing new DynamoDB scan patterns and stays consistent with the codebase.

### Step 2 — Add `getUsageReport` method to `adminController`
**File**: `server/src/controllers/adminController.ts`

Add method `getUsageReport(req, res)` that:
- Computes `fromMs = Date.now() - 7 * 24 * 60 * 60 * 1000`
- Calls `logManager.getLogEntriesForDateRange(fromMs, Date.now())`
- Maps each entry to a display object: `{ boatName, personName, checkOutFormatted, checkInFormatted, duration, reason }`
  - `checkOutFormatted`: format as `DD MMM YYYY HH:mm`
  - `checkInFormatted`: format as `DD MMM YYYY HH:mm`, or `"In use"` if `checkInDateTime` is 0 / falsy
  - `duration`: `"Xh Ym"` computed from the two timestamps, or `"In use"` if still checked out
- Computes the heading date range string
- Renders `adminUsageReport` view with the mapped data and date range

### Step 3 — Add route
**File**: `server/src/routes/routes.ts`

Add inside `setRoutes`:
```typescript
router.get('/admin/usageReport', checkIfAdminAuthenticated, adminController.getUsageReport.bind(adminController));
```
Place it alongside the other `GET /admin/*` routes (around line 35–45).

### Step 4 — Create EJS view
**File**: `server/views/adminUsageReport.ejs`

Structure (consistent with existing admin views):
- Admin nav header (copy pattern from `adminBoatsCheckedOut.ejs`)
- `<h2>Boat Usage Report</h2>`
- `<p>Showing usage from <strong><%= dateRange %></strong></p>`
- If `entries.length === 0`: `<p>No usage in the last 7 days.</p>`
- Otherwise: HTML table with columns: Boat | Checked Out By | Check-Out | Check-In | Duration | Reason
- Each row rendered from `entries` array
- "Back to Admin" link to `/admin`

### Step 5 — Add link on admin home page
**File**: `server/views/adminPage.ejs`

Add a link/button for "Usage Report" pointing to `/admin/usageReport`, consistent with existing navigation style on that page.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Full table scan is slow if log table grows large | Acceptable for now; matches existing pattern. Add DynamoDB GSI later if performance degrades |
| `checkInDateTime` may be 0 or undefined for in-progress checkouts | Guard with `if (!entry.checkInDateTime || entry.checkInDateTime === 0)` → show "In use" |
| Date formatting inconsistency | Use existing `moment` library (already a dependency in `package.json`) |

---

## Verification Steps

1. Run `cd server && npm run build` — must compile with no TypeScript errors
2. Run `npm start` in `server/` and visit `http://localhost:3000/admin/usageReport` — should redirect to login
3. Log in as admin, revisit — should render the usage table (or "no usage" message)
4. Manually check a boat out and in, reload the page — new entry appears
5. Confirm `/admin` home page shows the "Usage Report" link
6. Run `cd server && npm test` — existing tests must still pass
