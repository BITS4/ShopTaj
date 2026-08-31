# Security Policy

## Supported versions

Security fixes are applied to the current `1.x` line. Earlier development
snapshots are not supported.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Report a vulnerability privately

Please do not disclose a suspected vulnerability in a public issue, discussion,
or pull request. Use the repository's **Security → Advisories → Report a
vulnerability** form so maintainers can investigate before details are public.

Include the affected component, reproduction steps or a proof of concept,
impact, and any suggested mitigation. Remove real credentials, customer data,
and payment data from the report.

Maintainers aim to acknowledge a complete report within five business days,
confirm severity after reproduction, and coordinate a fix and disclosure with
the reporter. Good-faith research that avoids privacy violations, destructive
testing, and service disruption is welcome.

## Operational reminders

- Keep all credentials in environment variables and rotate any exposed value.
- Use Stripe test mode and synthetic data outside production.
- Run `npm run audit` and the full `npm run verify` gate before release.
