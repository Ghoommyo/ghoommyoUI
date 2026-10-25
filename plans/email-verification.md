# Email verification at signup, forgot password

Branch `email_verification` (from `image_uploads`). The server side is the Next.js repo's phase 24 (`plans/phase-24-email-verification.md` there, same branch name).

## Goal
- **Signup** (users and stores): a **Verify** button beside Email emails a 6-digit code. Signup works only after the right code is entered.
- **Forgot password:** a link on login. Enter the email, then the emailed code, then a new password, then log in.

## Decisions
- **A code, not a link:** the person stays in the form, and no deep links or domain are needed. The server sends it by Gmail SMTP for now (free).
- **Codes:** they last 10 minutes, with 5 tries and a 60 s wait between codes. The Resend button counts down the 60 s. A 429 from the server sets the countdown to the seconds it gives.
- **Verified email:** a right code gives a `verificationToken` (30 minutes), which signup or the reset sends. The email field then locks, showing "✓ Email verified", until **Change**.
  - Changing the account type clears the verification, since codes are per role. The field is keyed by role, so its state resets too.
  - Editing the email after a code was sent drops that code.
- **Forgot password doesn't reveal accounts:** the hint repeats the server's "If an account uses this email, we've sent it a code."
- **Test codes:** the dummy backend's code is always `123456`. The stub and a local server without SMTP return the code (`devCode`), and the Code field's hint shows it ("Test server: the code is …"). Production never returns it.
- `TextField` got an `accessory` slot for the button beside the input.

## Steps
1. API layer: `sendEmailCode`, `verifyEmailCode`, `resetPassword` in `Api`, the Ghoomo client, `mock.ts` and the stub; `verificationToken` on `SignupInput`.
2. `EmailVerifyField`, signup, `forgot-password.tsx`, the login link and the "Password changed" banner.
3. Docs: `Api.md` §5.0, `CLAUDE.md`.

## Done notes (2026-10-25)
- **Expo web, flag on** (local Next.js server with migration 013, no SMTP), with Playwright:
  - user and store signup: **Sign up** before verifying shows "Verify your email to continue."; a wrong code shows "4 tries left"; the right code shows "✓ Email verified" and locks the email; the account is created
  - forgot password for the new user and the new store: the code, then the new password, the "Password changed" banner; the old password fails and the new one logs in (the store by its store key)
  - an unknown email gets the neutral message
  - no page errors
- **Flag off:** user signup with the code, then forgot password and log in, without reloading (the dummy backend resets on reload).
- **Stub:** signup without a token refused; code → signup; store reset → log in with the new password (curl).
- **Android emulator** (development build, local server through `adb reverse`): the **Verify** button sits beside the email; the code arrives (from the server log), the Code field and **Confirm** work, and the email locks with "✓ Email verified" and **Change**.
