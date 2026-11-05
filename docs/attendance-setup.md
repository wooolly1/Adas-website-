# Team attendance — one-time Microsoft 365 setup

The website page is **adas.com.sa/#/team** (also linked as "Team login" in the footer).
Team members sign in with their Microsoft office account, then press **Check in** /
**Check out**. Their phone's location is compared with the office, the time is taken
from the server, and a row is written to an Excel workbook on OneDrive/SharePoint.

Until the steps below are done, the page shows "Attendance is not connected yet".

You need: a **Microsoft 365 admin** (Global admin or Application admin) and access to the
website's **Vercel** project. Time: about 20 minutes.

---

## 1. Create the Excel workbook

1. In OneDrive (or a SharePoint site) create a folder `Attendance` and a new Excel
   workbook in it named `ADAS Attendance.xlsx`.
2. **Sheet "Staff"** — type these headers in row 1, select them plus a few empty rows,
   then *Insert → Table* (tick "My table has headers"). In *Table Design* name the table
   **`Staff`** (exactly).

   | Email | Name | Active |
   |---|---|---|
   | sara@adas.com.sa | Sara | TRUE |

   Add one row per team member. Set `Active` to `FALSE` to block someone without deleting
   their history.

   For **annual leave**, add two more columns to the right of `Active` (click inside the
   table and type in the next column so the table grows):

   | Email | Name | Active | Role | Annual Days | Manager |
   |---|---|---|---|---|---|
   | kareem@adas.com.sa | Abdulkareem | TRUE | Manager | | |
   | walaa@adas.com.sa | Walaa | TRUE | Manager | | kareem@adas.com.sa |
   | amani@adas.com.sa | Amani | TRUE | | | walaa@adas.com.sa |
   | tamem@adas.com.sa | Tamem | TRUE | | 30 | kareem@adas.com.sa |

   Columns are matched by their header names, so the order doesn't matter.
   - **`Manager`** = the email of the person who approves this employee's leave. Their requests
     appear only in that manager's Approvals list on the Team page, and the email alert goes to them.
     If it's blank, the request goes to everyone with `Role` = Manager.
   - **`Role`** = **Manager** for anyone who approves leave; **HR** or **Admin** can see and decide
     every request. Leave it blank for everyone else.
   - **`Joining Date`** (recommended): the date the person joined, e.g. `2023-03-15` or `15/03/2023`.
     Their days are calculated from it: **22 a year**, **30 a year after 5 years' service** (the year
     they reach 5 years is split by date). In the **joining year** days are pro-rated and **earned month by
     month** (joined 1 July → about 1.8 days a month, 11 by 31 December); from the next year the
     full year is available on 1 January.
   - **`Opening Balance`** (optional): days someone still had left from before the system started
     (2026). From then on, **unused days carry over automatically** into the next year.
   - **`Annual Days`** is optional and overrides the 22/30 rule for that person (still pro-rated in the joining year).
   - A manager can't approve their own leave — set their own `Manager` to the person above them.
3. **Sheet "Attendance"** — headers in row 1, then *Insert → Table*, name it
   **`Attendance`** (exactly). The 14 columns, in this order:

   `Date` · `Email` · `Name` · `Check In` · `In Distance (m)` · `In Accuracy (m)` ·
   `In Lat` · `In Lng` · `Check Out` · `Out Distance (m)` · `Out Accuracy (m)` ·
   `Out Lat` · `Out Lng` · `Hours`

   Tip: select the `Date`, `Check In` and `Check Out` columns and set *Number format →
   Text* so Excel keeps them exactly as written. (The website copes either way.)
4. **Sheet "Leave"** (for annual leave) — headers in row 1, *Insert → Table*, name it
   **`Leave`** (exactly). The 11 columns, in this order:

   `ID` · `Requested` · `Email` · `Name` · `Start` · `End` · `Days` · `Note` · `Status` ·
   `Decided By` · `Decided At`

   For **other leave types** (Sick, Marriage, Funeral, New baby, Hajj, Unpaid) add a **`Type`**
   column anywhere in the table. Without it, only Annual leave can be requested.

   Set `Start` and `End` to *Number format → Text* as well. The website adds and updates
   these rows; `Status` is Pending, Approved, Rejected or Cancelled. To correct an approved
   request, edit its `Status` or `Days` cell directly.
5. **Sheet "Holidays"** (optional, for annual leave) — headers in row 1, *Insert → Table*,
   name it **`Holidays`**. Three columns:

   | Start | End | Name |
   |---|---|---|
   | 2027-02-22 | | Founding Day |
   | 2026-09-23 | | National Day |
   | *(official start)* | *(official end)* | Eid al-Fitr |
   | *(official start)* | *(official end)* | Eid al-Adha |

   - Dates as `YYYY-MM-DD` (set the columns to *Text*). Leave `End` blank for a one-day holiday.
   - Days in this table are not counted as leave, and staff see the upcoming ones on the Team page.
   - Eid dates follow the official announcement each year, so add them when they are announced.
     Holidays added later also apply to pending requests' future counts, but not to requests
     already sent — adjust `Days` in the Leave table if needed.
6. Leave the Attendance table empty — the website adds the rows. Don't rename the tables
   or move the columns. You can add your own sheets, pivot tables and charts freely.

## 2. Register the app in Microsoft Entra

1. Go to **entra.microsoft.com → Applications → App registrations → New registration**.
   - Name: `ADAS Website Attendance`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: platform **Single-page application (SPA)**,
     URI `https://adas.com.sa/auth-popup.html`
     (add `https://www.adas.com.sa/auth-popup.html` too if the site is also served on www).
2. On the app's **Overview** page copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**
3. **Certificates & secrets → New client secret** (e.g. 24 months). Copy the **Value**
   immediately — it is shown once. Put a reminder in the calendar to renew it before it
   expires.
4. **API permissions → Add a permission → Microsoft Graph → Application permissions →
   `Files.ReadWrite.All`** → Add, then **Grant admin consent for ADAS**.

   *Tighter option (recommended if your IT is comfortable with it):* keep the workbook in
   a dedicated SharePoint site and use the `Sites.Selected` permission instead, granted
   only to that site. Then use the `/sites/<site-id>/drive` form in step 3.

**Optional — leave emails.** To email managers about new requests and staff about decisions,
also add the Graph *application* permission **`Mail.Send`** (grant admin consent) and set
`MAIL_FROM` below. Without it, leave still works; people just check the Team page.

## 3. Add the settings to Vercel

Vercel → the website project → **Settings → Environment Variables** → add each one for
**Production** (and Preview if you test there):

| Name | Value |
|---|---|
| `MS_TENANT_ID` | Directory (tenant) ID from step 2 |
| `MS_CLIENT_ID` | Application (client) ID from step 2 |
| `MS_CLIENT_SECRET` | the secret **Value** from step 2 |
| `ATT_DRIVE` | `/users/OWNER@adas.com.sa/drive` — the account whose OneDrive holds the workbook (or `/sites/<site-id>/drive` for SharePoint) |
| `ATT_WORKBOOK_PATH` | `Attendance/ADAS Attendance.xlsx` |
| `OFFICE_LAT` | office latitude, e.g. `21.7xxxxx` |
| `OFFICE_LNG` | office longitude, e.g. `39.1xxxxx` |
| `RADIUS_M` | allowed distance in metres, e.g. `150` |
| `ALLOWED_DOMAIN` | `adas.com.sa` |
| `ANNUAL_LEAVE_DAYS` | optional, default `22` |
| `LEAVE_DAYS_AFTER_5Y` | optional, default `30` |
| `WORK_START` | optional, default `09:00` — start of the office day |
| `LATE_GRACE_MIN` | optional, default `15` — check-in after `WORK_START` + this is **late** (09:15) |
| `CHECKIN_CLOSES` | optional, default `11:00` — after this check-in is closed and the day counts as **absent** |
| `LEAVE_START_YEAR` | optional, default `2026` — first year the system counts carry-over from |
| `MAIL_FROM` | optional: a mailbox such as `office@adas.com.sa` to send leave emails from |

Office coordinates: in Google Maps, right-click exactly on the office building — the first
line of the menu is `latitude, longitude`.

Then **Deployments → … → Redeploy** so the function picks up the variables.

## 4. Turn on the page

Send the **client ID** and **tenant ID** (not the secret) to whoever edits the website.
They go into `MS_CLIENT_ID` and `MS_TENANT_ID` near the "TEAM ATTENDANCE" section of
`app.jsx`. These two IDs are public by design; the **client secret must never go into the
website code** — only into Vercel.

## 5. Test

1. On your phone, at the office, open adas.com.sa/#/team → **Sign in with Microsoft**.
2. Allow location when asked → **Check in**. A row should appear in the Attendance table.
3. Try from home: it should say you are too far from the office.

---

### Good to know

- **Location** is read only at the moment someone presses Check in / Check out. Tell the
  team this in writing (a short notice is enough) — under Saudi Arabia's Personal Data
  Protection Law staff should know what is collected and why.
- **GPS can be faked** with special apps. This is a strong everyday check, not forensic
  proof. If you need more, you can later restrict check-in to the office Wi-Fi's public IP.
- **Accuracy**: indoors GPS can drift. If people near windows still fail, raise `RADIUS_M`
  to 200–250 in Vercel (no code change needed).
- **One check-in and one check-out per person per day.** To fix a mistake, edit the row in
  Excel directly.
- **Vercel plan**: Vercel's free Hobby plan is for non-commercial use; a company website
  should be on the Pro plan.

### Leave types

| Type | Rule |
|---|---|
| Annual | Joining-date entitlement with carry-over (see Staff columns) |
| Sick | Up to 120 days a year (30 full pay, 60 at 75%, 30 unpaid); may be entered up to 30 days after it started; optional medical report (PDF, max 3 MB) is emailed to the manager — needs `MAIL_FROM` |
| Marriage | Up to 5 days per request |
| Funeral | Up to 5 days per request (spouse, parent, child); up to 7 days back |
| New baby | Up to 3 days per request; up to 7 days back |
| Hajj | Up to 15 days, once, after 2 years' service |
| Unpaid | No limit; manager decides |
| Site visit | Work outside the office **today, for chosen hours** (e.g. 11:00–14:00; site or client name required). Once approved: check in/out from the site from 1 hour before until 1 hour after (location recorded, any distance); a visit starting by 11:00 waives the late rule and the 11:00 cut-off; counts as worked, no balance used. An afternoon visit doesn't excuse missing the morning |

Only Annual leave uses the annual balance. Every type goes to the same manager for approval.

### Manager dashboard

On the Team page, managers see their team and HR/Admin see everyone, in two tabs, each by **Day**,
**Week** (Sun–Thu) or **Month**, with arrows to move back and forward:

- **Attendance** — Day: each person's status (on time, late, absent, on leave, not in yet, out on
  short leave). Week: a grid of each person × each day. Month: present days, hours, late arrivals and
  minutes, missing check-outs, absences, short leave and leave by type.
- **Leave** — who is on leave (approved and pending) in the period, totals, and everyone's annual
  balance (for the year, carried, taken, pending, left).

In the Day view each check-in / check-out has a **📍 map link** with its distance from the office.
Every view has **Download for Excel** (CSV). Absent = a working day with no check-in and no approved
leave, counted once check-in has closed (11:00).

### Short leave (step out / back in)

Add a table **`Permissions`** (headers in row 1, *Insert → Table*, name it exactly) with:

`Date` · `Email` · `Name` · `Out` · `In` · `Minutes` · `Reason` · `Status` · `Planned` · `Approved By`

Set `Date`, `Out` and `In` to *Text*. **With approval:** while checked in, staff choose how long
(15–90 min) and an optional reason and tap **Request to step out**; their manager is emailed and
approves or declines in **Short leave requests** on the Team page. Once approved, staff tap
**Step out** and **Back in** (both check they're at the office). Unused approvals expire at the end of
the day; time beyond what was approved is marked `Over approved time by N min`. Limits: **1.5 hours a day in total** (can be split into several trips) and **6 hours a week**
(Sun–Thu) — Step out is blocked when used up, and time beyond the limit is marked
`Over limit by N min` in `Status`. Checking out while
stepped out closes it at check-out time. Short leave actually taken (stepped out and back) is
**deducted from that day's `Hours`** in the Attendance table; requests that were never used are not. Change the limits with `PERMISSION_DAY_MIN` (default 90)
and `PERMISSION_WEEK_MIN` (default 360) in Vercel. Without the table, the buttons don't appear.

### Phone notifications (installable app)

The Team page is an installable app (`manifest.webmanifest`, service worker `sw.js`). Staff install it
once and tap **Turn on notifications**:

- **iPhone (iOS 16.4+):** open adas.com.sa/#/team in **Safari** → Share → **Add to Home Screen** → open
  **ADAS** from the Home Screen → sign in → **Turn on notifications** → Allow. (iPhone only allows web
  notifications from the Home Screen app, and it has its own sign-in separate from Safari.)
- **Android / computers:** open the Team page in Chrome or Edge → **Install app** (or menu → Add to
  Home screen) → **Turn on notifications**.

Who gets what: managers — new leave, site-visit and short-leave requests; staff — approvals,
declines and cancellations; everyone — **"Check-in closes at 11:00"** (10:30, if not checked in and
not on leave) and **"Don't forget to check out"** (18:30, if still checked in), Sun–Thu, not on holidays.

Setup (once):
1. Excel: add a table **`Devices`** with `Email · Endpoint · P256dh · Auth · Added · Device`.
2. Vercel → Settings → Environment Variables: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (`mailto:office@adas.com.sa`) and `CRON_SECRET` (any long random text) → Redeploy.
   Treat `VAPID_PRIVATE_KEY` and `CRON_SECRET` like passwords. If `VAPID_PRIVATE_KEY` is ever changed,
   everyone has to turn notifications on again.
3. Reminders run from `vercel.json` (`crons`): 07:30 and 15:30 UTC = 10:30 and 18:30 Riyadh. On the
   Hobby plan Vercel may run them up to an hour late; on Pro they run on time.

## Office admin (office@adas.com.sa)

`office@adas.com.sa` signs in as the **admin**. It doesn't need a row in the Staff table, and it has
no check-in card. It sees every report, approval and request for the whole team, and it gets an
**Admin panel** on the Team page where you can:

- edit each person's name, joining date, annual days (leave blank for automatic 22/30),
  opening balance, role, manager and active status;
- **add or remove leave days**. Type a number such as `2` or `-1` and a reason. Each adjustment is
  saved as an approved row in the Leave table (Type = `adjust`), so there's always a record of who
  changed what and why, and the employee gets a notification;
- add a new team member.

To make more admins, set the Vercel env var `ADMIN_EMAILS` (comma-separated). It defaults to
`office@adas.com.sa`. Editing a field needs its column in the Staff table (`Joining Date`,
`Annual Days`, `Opening Balance`, `Manager`, `Role`), and adjustments need the `Type` column in the
Leave table. The panel tells you if one is missing.
