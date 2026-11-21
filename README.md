# Sweety — blood glucose tracker

A small personal glucose journal built with React, Express and PostgreSQL. Each account can manage its own readings and view daily, month-to-date and previous-month summaries.

## Demo

Screen recording: https://drive.google.com/file/d/1qM_rLvQ0jQaUAwDIYprb0Uzh9NmN2enH/view?usp=sharing

Demo login: `demo@sweety.app` / `SweetyDemo123!`

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer

## Setup

1. Create a database, for example `createdb sweety`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long, random `JWT_SECRET`.
3. Install packages with `npm install`.
4. Create the tables with `psql "$DATABASE_URL" -f server/schema.sql`.
5. Start the API and frontend together with `npm run dev`.
6. Open [http://localhost:5173](http://localhost:5173). The API runs on port 4000.

For a production build, run `npm run build` and start the API with `npm start`. Serve the generated `dist` directory from a static host or configure Express/a reverse proxy to serve it. Set `CLIENT_ORIGIN` to the deployed frontend origin.

## Demo account

Run `npm run seed` after creating the schema. This creates or updates:

- Email: `demo@sweety.app`
- Password: `SweetyDemo123!`

The seed inserts four readings for the current date and is safe to rerun. Change the demo password before using the account anywhere outside a local demo.

## Tests

Run `npm test` for the reading validation unit tests. They use Node's built-in test runner and do not need a running database.

## API overview

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/readings`, `POST /api/readings`, `PUT /api/readings/:id`, `DELETE /api/readings/:id`
- `GET /api/reports?date=YYYY-MM-DD`

Send the login token as `Authorization: Bearer <token>`. Every reading query is scoped to the authenticated user. The database also enforces one reading per slot per day and the allowed value range.

## Notes

- Dates are stored as PostgreSQL `DATE` values and sent in `YYYY-MM-DD` form. The browser sends its IANA timezone with API requests, so “today” and future-date validation use the patient's local calendar day rather than the server's UTC day. The selected report date drives all three report ranges; “monthly” means the full calendar month immediately before the selected date’s month.
- Authentication uses a signed seven-day bearer token stored by the browser in local storage. A production deployment should use HTTPS, consider secure same-site cookies and add token revocation/refresh behavior.
- The UI uses one date selector for the report and reading form so a user can correct a past day. Changing the date updates the daily list and summary cards.
- With more time, I would add API integration tests against a disposable PostgreSQL database, rate limiting, password reset, pagination, and accessible chart views.

## Environment variables

See `.env.example` for all required variables. Never commit `.env` or a real signing secret.
