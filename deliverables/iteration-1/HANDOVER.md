# Smart F&B Iteration 1 handover

Prepared on 27 October 2026 using the supplied SEP490 templates. Read README.md for reproduction instructions and the source revision manifest for provenance.

## Scope and ownership

The team confirmed that Iteration 1 covered learning F&B operations, identifying problems and proposing the solution direction. The SRS and SDD describe the product baseline and compare it with current source evidence. They do not claim that every current function was completed during the historical first iteration.

| Member | Student ID | Responsibility |
|---|---|---|
| Trần Hữu Đăng Quân | SE183749 | Backend for web Admin, Owner and Manager |
| Nguyễn Bảo Khánh | SE196322 | Frontend for web Admin, Owner and Manager |
| Lê Văn Tiến | SE182969 | Phone/tablet Cashier, Barista and staff functions, jointly with Bảo |
| Vũ Hà Gia Bảo | SE190374 | Phone/tablet Cashier, Barista and staff functions, jointly with Tiến |

Supervisor: **Tôn Thất Hoàng Minh**. The team has not specified a backend/frontend split between Bảo and Tiến. Staff refers to operational personnel rather than an additional permission role.

## Review order

1. Review Report 1 for the problem, discovery scope and proposed solution.
2. Review Report 2 and Project Tracking for ownership, proposed estimates, risks and relative milestones. Supply actual calendar dates and historical research records.
3. Review Report 3 and Report 4 together using the shared 33 requirement IDs and their design mappings. Resolve the differences listed in diagrams/reconciliation.md.
4. Review Report 5 and Test Report. The 66 acceptance cases remain Pending until executed with recorded evidence.
5. Verify the release manifest, reproduce the automated checks and rehearse database installation on a disposable database.

## Verified evidence and limits

Local frontend type checking, linting and production build passed; 737 of 737 frontend tests passed. Backend build and 186 unit/service tests passed. Service mocks do not establish live database, payment or device behavior. The local GitHub Actions template defines quality checks without deployment. It is excluded from Git and has not run remotely. This package is local only; no commit, tag or GitHub publication was performed.

The package includes schema-only SQL, 35 original migrations, Prisma schema, the physical data dictionary, pinned backend source and committed Android reference source. The original 18-page draw.io snapshot is retained. The Android reference excludes five pre-existing staged changes and is not a tested APK.

## Outstanding review and execution

- Provide actual execution dates, original research records and a historical source tag if historical Iteration 1 provenance is required.
- Confirm the current 14-day trial, subscription checkout and poster rules against the older specification.
- Resolve real AI integration and personal password-change scope.
- Select a clean Android revision for device acceptance.
- Execute isolated database migration/seed rehearsal, end-to-end tests, real PayOS callbacks, printer/device tests and performance tests. Docker was unavailable during preparation, so database execution remains Pending.

All estimates are proposals, not recorded effort. Change a test to Passed only after recording its actual result, execution date and supporting evidence.
