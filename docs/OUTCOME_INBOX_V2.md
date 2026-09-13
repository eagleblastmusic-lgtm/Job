# Outcome Inbox V2

## Purpose

Outcome Inbox reduces friction in recording recruitment outcomes without silently changing application state.

## Implemented boundary

V2 accepts a user-pasted recruitment message tied to one of the user's applications. A deterministic classifier can suggest `REJECTION`, `INTERVIEW`, `OFFER`, `RECRUITER_CONTACT` or `UNKNOWN` with an explicit confidence value. The suggestion is persisted as `PENDING`.

The application status and `outcomes` table are changed only after the user explicitly chooses **Potwierdź**. Dismissing a suggestion records no recruitment outcome. Confirmation is transactional: application status, confirmed outcome and inbox resolution succeed or fail together.

## Privacy and safety

- user-scoped SQL ownership on applications and inbox items;
- no automatic status mutation from message content;
- message storage is bounded to a short excerpt;
- no hidden use of health, politics, family status or other sensitive traits;
- Outcome Inbox data is included in the user export and deleted with the user through foreign-key cascades;
- the feature is disabled by default behind `outcome_inbox`.

## External email integration

The Master Plan calls email integration optional. This repository does **not** claim provider-backed mailbox access. A future connector may create the same pending suggestions, but it must preserve explicit user confirmation and pass a separate privacy/security review before rollout.
