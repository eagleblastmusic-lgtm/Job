# Admin instructions

Set `ADMIN_EMAILS` before registering the administrator account, e.g.:

```env
ADMIN_EMAILS=admin@example.pl
```

A matching account receives role `ADMIN` at registration.

Protected endpoint:

`GET /api/admin/diagnostics`

It reports aggregate counts, recent AI failures and feature-flag state. It intentionally does not expose raw CVs or sensitive user content.
