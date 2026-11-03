# Diagram reconciliation

Original Drive file is retained unchanged as source.drawio. New PNG/drawio views summarize the current baseline. The original 18 pages are not all consistent with v9.2 or current code.

## ISS-02 Old draw.io scope differs from v9.2

Remove branch-specific prices, profit/workforce reports, audit screen, OCR menu import and strategic AI from the normalized committed scope; retain original diagrams as evidence.

## ISS-03 Onboarding changed to 14-day trial

Code automatically creates TRIAL for 14 days; WF-01 says admin selects plan/expiry. SRS/SDD describe code; approve revised business baseline.

## ISS-04 Platform subscription checkout is new scope

v9.2 excluded in-system subscription collection, but platform-billing and MyPlan implement trial-to-paid PayOS. Keep distinct from merchant sales; acceptance pending.

## ISS-05 Poster contract differs

v9.2: six posters, eight-second rotation, /posters. Code: ten, 3-60 seconds, /display-posters. Use current API in both reports.

## ISS-06 Password hashing description is stale

v9.2 says bcrypt; current PasswordService uses Argon2id. SRS security baseline corrected to Argon2id.