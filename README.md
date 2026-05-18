# WTC Service Management

Professional medical equipment field service system built with Next.js 15, TypeScript, Tailwind CSS, Turso, Google Drive, OpenStreetMap, NextAuth, and PWA support.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Demo users:

- `admin@wtc.local`
- `manager@wtc.local`
- `engineer@wtc.local`

Default password: `demo123`.

## Turso Backend

Create a Turso database and add these environment variables:

```env
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-database-auth-token"
```

Run the schema migration:

```bash
npm run db:migrate
```

To migrate existing spreadsheet data one time, export each old tab as CSV into `data/import` and run:

```bash
npm run db:import-csv
```

The importer recognizes `Customers.csv`, `DeviceModels.csv`, `Installations.csv`, `AMCContracts.csv`, `CMCContracts.csv`, `RRCContracts.csv`, `Tickets.csv`, `Engineers.csv`, `TicketLogs.csv`, `PMSSchedule.csv`, `Users.csv`, and `Notifications.csv`.

Create the default admin login:

```bash
npm run db:create-admin
```

The default admin is `admin@wtc.local` with password `demo123`. Override with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` if needed. Authentication is backed by the Turso `users` table. The current implementation compares `PasswordHash` as plain text.

## Machine Photos

`DeviceModels` and `Installations` both support `ImageURL`. A model image is reused for every installation of that model; an installation image overrides it when present.

For Google Drive images, set the file sharing to **Anyone with the link can view** and use a direct image URL format:

```txt
https://drive.google.com/uc?export=view&id=FILE_ID
```

The `FILE_ID` is the long ID from a Drive share link.

## Creating Customers And Installations

Customers, device models, and installations can be created from the app:

- `/customers/new` creates a row in `Customers`.
- `/device-models/new` creates a row in `DeviceModels` for admins.
- `/machines/new` creates a row in `Installations` and auto-generates linked rows in `PMSSchedule`.
- `/machines` shows installed equipment grouped by customer/institution.
- `/contracts` shows warranty-expired installations and AMC/CMC/RRC coverage.

For installation creation, the user selects the customer and device model by name. The app writes linked IDs internally.

`WarrantyExpiry` is calculated from `InstallationDate + WarrantyYears`. PMS schedule rows are generated using `DeviceModels.PMSFrequency` until the warranty expiry date.

Tickets always generate a fresh `TicketID` on the server, and the ticket `Date` is saved automatically when the ticket is created. Contract and warranty status are derived from the selected installation and contract records.

## Attachments

Images and signatures upload through `/api/upload`, are stored in Google Drive, and their URLs are written back to ticket fields/logs. Set `GOOGLE_DRIVE_PUBLIC_UPLOADS=true` if uploaded files should be viewable by link.

## Notifications

Email notifications use SMTP first. Gmail works with an app password:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`

The notification service is isolated in [src/lib/notifications.ts](src/lib/notifications.ts) so WhatsApp or SMS providers can be added without changing ticket workflows.

## PWA

The app includes a manifest and service worker for installability and cached shell routes. Browser GPS tracking is throttled to one update per minute while the app is open to reduce battery usage.

## Deployment

Deploy to Vercel and add the same environment variables from `.env.example`. Use `AUTH_URL` with your production domain and rotate `AUTH_SECRET` for production.
