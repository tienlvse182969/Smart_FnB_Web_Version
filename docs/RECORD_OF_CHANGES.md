# Record of Changes (Web) — modelled on SWP490 R2 BM03

Columns follow form BM03, section 2 "Changes": No. | Section | Current content | Proposed content | Reason | Proposed by.
The BM03 file has no filled-in version (its Version / Date fields are blank), so numbering starts at No. 1.
"Section" holds the spec reference (UC/BR). "Proposed content" starts with the date and change type (A = Added, M = Modified, D = Deleted).
Source of truth: `docs/Smart-FnB-Dac-ta-v14.md`.

| No. | Section | Current content | Proposed content | Reason | Proposed by |
| --- | ------- | --------------- | ---------------- | ------ | ----------- |
| 1 | BM-06, BR-82 | Store Manager could cancel a paid order directly (`POST /manager/orders/:id/cancel-paid`, now removed in the BE); approval list showed order, amount and reason only, with 20 s polling | 2026-11-06 — M — Direct cancel-paid call, modal and helpers removed; refund-approval list adds payment time, requested lines, status filter, refresh button, amount-aware confirm dialog, realtime refresh (`refund.approval-requested/reviewed`). Partial: payment method, line names and requesting cashier are not returned by the BE list. Store Manager direct cancel + cash refund for REQUIRES_ATTENTION orders is missing in the BE | BE removed `cancel-paid` (Review 1 / Iteration 1 finding); spec v14 to be aligned with code | FE Web |
| 2 | OW-09 (removed in spec v10), BR-38..40 | Owner had an "AI data assistant" screen (`/owner/ai`), an `ai` API module (mock only) and an `ai` module flag; `FLAG_NOTES` were out of date (change-password, public registration, cancel-paid, AI) | 2026-11-06 — D — Removed AiAssistant screen, route, navigation entry, `src/api/modules/ai`, the `ai` flag and related tests. M — `FLAG_NOTES` rewritten to match the current BE. Not removed: the plan-tier feature flag `aiAssistant` (plan/tiers, pricing section, plans table) — outside the stated scope, needs a decision | OW-09 and BR-38..BR-40 were dropped from the spec in v10 | FE Web |
