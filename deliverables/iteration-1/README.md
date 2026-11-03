# Smart F&B Iteration 1 review package

Prepared on 27 October 2026 for SP26SE123. The team confirmed that Iteration 1 focused on learning F&B operations, framing problems and proposing the solution direction. Reports formalize that work; the current code snapshot is technical reference evidence, not a claim that all functions were completed during the historical first iteration.

## Confirmed team

| Member | Student ID | Responsibility |
|---|---|---|
| Trần Hữu Đăng Quân | SE183749 | Backend for web Admin, Owner and Manager |
| Nguyễn Bảo Khánh | SE196322 | Frontend for web Admin, Owner and Manager |
| Lê Văn Tiến | SE182969 | Phone/tablet Cashier, Barista and staff functions, jointly with Bảo |
| Vũ Hà Gia Bảo | SE190374 | Phone/tablet Cashier, Barista and staff functions, jointly with Tiến |

Supervisor: **Tôn Thất Hoàng Minh**. “Staff” describes operational personnel; it is not introduced as a separate authenticated role without a defined permission contract. The division between Bảo and Tiến within the mobile platform is not invented.

## Start here

- `reports/`: Report 1–5 in editable Word format, following the supplied SEP490 report structure. The SRS and SDD share the same 33 requirement IDs and disclose implementation gaps.
- `tracking/Project_Tracking.xlsx`: Iteration 1 discovery work, product WBS/backlog, Issues, Defects, Q&A, Traceability and relative Milestones.
- `tracking/Test_Report.xlsx`: 66 prepared acceptance cases, 737 executed web assertions, backend evidence and a pending NFR plan. Pending acceptance must not be interpreted as a pass.
- `diagrams/source.drawio`: the original 18-page Drive diagram snapshot. Reconciled local figures are separate; the Drive original was not edited.
- `diagrams/reconciliation.md`: scope conflicts between old diagrams, v9.2 and current source.
- `database/`: schema-only SQL, original Prisma schema, all 35 source migrations and full physical data dictionary.
- `source/backend.zip`: selected tracked build/runtime/test inputs from the pinned backend commit. Tracked package caches and unrelated documents are omitted.
- `source/android-committed-reference.zip`: committed Android reference only. The source working tree had five staged poster-related changes, which are deliberately excluded. This archive is not a tested APK.
- `requirements.json`, `api-inventory.csv`: shared traceability catalogue and static controller inventory. Legacy endpoints/models do not imply committed product features.
- `evidence/`: results actually collected in this run.
- `manifest.json`: source revisions, limitations and SHA-256 checksums. The manifest does not hash itself.

The web implementation is the enclosing Git repository. The proposed tag `iteration-1-20261027` has not been created or published. At the team's request, this package, its output copies, verifier and CI template are excluded from Git. No package files were committed or pushed to GitHub. Actual historical dates, research records, the original historical source tag and scope-change approval remain to be supplied; the roster and discovery focus are confirmed.

## Reproduce web checks

Use Node 22 and pnpm 10.34.3 (same family as the existing web CI):

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm test
node scripts/release/verify-iteration-1.mjs
```

Local evidence was collected with Node 26.5.1 / pnpm 11.19.0: 737 web and 186 backend assertions passed. Remote CI is separate evidence. The unpublished template `.github/workflows/iteration-1.yml` defines checks without deployment. Remote CI has not run.

## Reproduce backend service checks

Extract `source/backend.zip` into a new directory. Use Node 24.21.0 (the backend `.node-version`, within its declared Node 24 range) and pnpm 11.19.0, then:

```sh
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:validate
pnpm test
```

Supply a syntactically valid disposable `DATABASE_URL` for schema validation. These service tests mock persistence; their success is not proof of database migration or live payment integration. Never copy production secrets into the package.

## Database installation choices

Use a new, disposable PostgreSQL database for rehearsal. Configure credentials outside version control.

**Recommended: original migrations.** From the extracted backend, set `DATABASE_URL` to the new database and run `pnpm prisma:migrate:deploy`. For an authorized demo, review `prisma/seed.ts` and provide local synthetic seed settings before explicitly running `pnpm prisma:seed`. Seed is not automatic in this package.

**Alternative: schema-only SQL.** `001-baseline.sql` was generated with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`. It creates the complete current schema, including retained legacy objects. Apply only to an empty database with `psql -v ON_ERROR_STOP=1 -f database/001-baseline.sql`. It does not populate roles/plans/demo data or Prisma migration history. Do not then replay the original full migration chain on that same database. Choose one route per database.

Docker was unavailable during preparation, so neither database route was executed. Integration, real PayOS callbacks, Android hardware/printing, load and user acceptance remain pending. The test workbook states these limits explicitly.

## Required review decisions

1. Add actual review dates and historical discovery evidence; discovery scope and roster are already confirmed.
2. Approve or revise the current 14-day trial and platform subscription checkout changes.
3. Confirm current poster contract (10 posters, 3–60 seconds) and Argon2id security description.
4. Resolve mock AI and incomplete personal password-change scope.
5. Select a clean Android revision and execute isolated DB/E2E/device/NFR acceptance.

Do not rename a pending case to Passed without recording the actual result, execution date and relevant defect/evidence.
