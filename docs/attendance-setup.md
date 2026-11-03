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

   | Email | Name | Active | Role | Annual Days |
   |---|---|---|---|---|
   | kareem@adas.com.sa | Abdulkareem | TRUE | Manager | |
   | sara@adas.com.sa | Sara | TRUE | | 30 |

   - `Role` = **Manager** lets that person approve or decline leave. Leave it blank for everyone else.
   - `Annual Days` is optional: blank means the default **22 days** a year.
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
