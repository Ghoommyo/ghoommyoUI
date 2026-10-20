# Home page, About, Privacy, Terms, Help & FAQ, Contact, Delete account

Branch `info_pages` (from `admin_console`). The Next.js repo's `plans/phase-21-pages-home.md` is the shared plan (copied below); the API (`DELETE /apis/account`) and the website pages are done there.

## Context
The app has no pages that explain it or cover what an app store and a public website need. The request:
- an **About** page that explains Ghoomyo for customers and for stores, with images
- a **Privacy** page
- the other pages an app and website need
- a **Home** page showing store types with the highest-rated stores in each

On the web these are pages; in the app they go in the menu.

## Decisions (agreed 2026-10-20)
- **Home** is a **separate menu entry** (web and app). The current start screens stay as they are.
- **Extra pages:** Terms of service, Help & FAQ, Contact us, Delete account. Google Play requires an account-deletion link and in-app deletion for apps with logins.
- **About uses real screenshots** of the app, captured from the running web app.
- **Contact email:** **ghoommyo@gmail.com** on the Contact, Privacy, Terms and Delete-account pages.

## Home page (web `/home`, app "Home" in the drawer)
- **Data:** built from the public store list (`GET /apis/location`, which already carries the category, service type and rating). No new API.
- **Grouping:**
  - stores are grouped by type: a product store's category, or a service store's type of service; stores with neither go under "Other stores"
  - groups are ordered by how many stores they have
  - inside a group, stores are sorted by rating (average, then number of ratings), and unrated stores come last
  - each group shows its top 6
- **Layout:**
  - a row of type chips at the top; tapping one jumps to (or filters to) that group
  - store cards: name, stars and count, type, city, and **Book** → the dashboard with that store selected (web `/dashboard?store=<id>`; app `/dashboard?storeId=<id>`, a new param)
  - **Reviews** → the store's reviews
- Open to guests too.

## Content pages (web, public, under `app/(main)/`)
| Page | Route | What it covers |
|---|---|---|
| About | `/about` | what Ghoomyo is; **For customers**: find a store, see how busy it is, pick a slot, products or services, order types, store address or delivery address, notifications, ratings, reminders (app). **For stores**: settings (Product/Service, category or type of service, dark store, hours, limits), items, accepting/rejecting, the calendar, notifications, reviews. Each step has a captioned screenshot. |
| Privacy policy | `/privacy` | the data collected (account, mobile, bookings, items, delivery and saved addresses, ratings, notifications, reminder settings, store profile), why, who sees it (the store you book sees your booking details), hosting (Vercel, Prisma Postgres), cookies (sign-in only), retention, deletion, children, changes, contact. Shows a "last updated" date. |
| Terms of service | `/terms` | using the service; a booking is between the customer and the store; store responsibilities; accounts and inactive accounts; acceptable use; liability; changes; contact |
| Help & FAQ | `/help` | short Q&A on booking, order types, addresses, editing, notifications, ratings, reminders, store setup, inactive accounts |
| Contact us | `/contact` | email button (`mailto:ghoommyo@gmail.com`) and what to include. The inactive-account notices link here. |
| Delete account | `/delete-account` | what is deleted and kept; signed in → **Delete my account** with password confirmation; signed out → how to request by email |

- **Menu:** web `SideMenu` gets **Home** (everyone), and a secondary group with About, Help & FAQ, Contact us, Privacy policy, Terms of service, Delete account (everyone; the delete page itself handles signed-out visitors).
- **Footer:** short links to Privacy, Terms and Contact on the login and signup pages.
- The legal text is a sensible draft for review, not legal advice.

## Account deletion (API)
`DELETE /apis/account` `{ password }` with a user or store token. The password must match (403 otherwise). It runs in one transaction:
- **Customer:**
  - the account is deactivated and anonymised (the email is replaced so it can sign up again; name, mobile and password are cleared)
  - saved addresses, reminder settings and their notifications are deleted
  - their bookings stay for the stores' records, with name, mobile and delivery address replaced by "Deleted user" / null
  - their upcoming pending/accepted bookings become REJECTED ("Account deleted")
  - ratings stay, anonymous
- **Store:**
  - the location is deactivated and anonymised (name, email and code are replaced; the password is cleared)
  - its items are deactivated and its profile address and bio cleared
  - its upcoming pending/accepted bookings become REJECTED ("Store closed its account"), and customers are notified (best-effort)
- No migration needed. `docs/API.md` documents it.

## App (Expo)
- **Native screens in the drawer:** Home, About (the same screenshots bundled in `assets/images/about/`), Contact (email button), Delete account (password + confirm).
- **Privacy policy, Terms of service and Help & FAQ** open the website pages in an in-app browser (`expo-web-browser`, site URL derived from the API URL). One source for the legal text, and Google Play needs the web URLs anyway.
- **API layer:** `deleteAccount(password)` in the Ghoomo client, mock and stub. After deletion the app signs out.
- The user dashboard accepts a `storeId` param (from Home).

## Verification
- **curl:**
  - delete with a wrong password → 403
  - customer deletion → can't sign in; the same email can sign up again; addresses are gone; the store's bookings show "Deleted user"; upcoming ones are rejected
  - store deletion → it leaves the list and its future bookings are rejected and notified
  - delete with no token → 401
- **Headless Chrome (390/1280, light/dark):** Home groups and sorting, chips, Book → dashboard preselected; every page renders; menu links; the delete flow for a throwaway account.
- **Expo:** the web build (real backend and dummy) and Android: the drawer entries, Home → Book, About images, links opening the website, the delete flow.
- `tsc`, lint and `next build`; `tsc` and `expo lint`. Commit each step; push both branches.
