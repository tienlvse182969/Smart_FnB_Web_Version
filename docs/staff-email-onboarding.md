# Email onboarding for restaurant staff

Owner's account screen now invites Manager, Cashier or Barista via `POST /employees/invitations`. The form collects name, email, role and branch, never a username/password. The API response is `{account, invitationExpiresAt, emailStatus}`; the account may have `branchId` instead of a nested branch. A created account is pending until the recipient sets a password.

The existing public `/setup-password?token=...` page works for Owner and all invited staff. It posts `{token,password}` to `/auth/setup-password`. Vercel already rewrites deep links to the SPA. Cashier/Barista then sign in on their POS/bar application; they do not gain Owner/Manager web access.

Owner password email/reset and status changes now collect a 3–500 character reason. Pending invitations use `/employees/:id/invitation/resend`; password resets use `/employees/:id/reset-password`. Cancelled invitations cannot be reset, and pending accounts cannot be manually activated. Manager's existing invitation, resend/reset and cancellation screens remain available; cancelled invitations display their distinct state and cannot resend.

`SENT` means the email provider accepted the message; PENDING/FAILED must not be presented as successful delivery. On a resend cooldown (429), wait at least 60 seconds. Do not recreate an account just because its email failed. Suspended/cancelled/pending accounts still count against the BE quota.

## Deployment

1. Deploy BE containing the staff-email-invitations migration and API change before this FE. The old `/employees/accounts` route is no longer used.
2. FE: `VITE_API_BASE_URL` must point to the deployed BE including `/api/v1`; `VITE_API_AUTH=real`, `VITE_API_ACCOUNT=real` (these are already defaults).
3. BE: keep the existing working email sender configuration. `PUBLIC_WEB_URL` must be the deployed FE origin so `/setup-password` opens this site, not localhost.
4. Build with `pnpm build`; deploy the FE. Test one invitation using an email you control. Confirm pending login is denied, the email opens the public form, password setup succeeds once, and the invited role can log in to its intended app.

Legacy username accounts can still log in and retain the legacy password-reset drawer. No test sends an actual email; real delivery should be verified after both deployments.
