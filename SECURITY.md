# Security Policy

## Supported Versions

The current active version of World Cup App is:

| Version | Supported |
|---|---|
| 3.0.x | Yes |
| Earlier versions | No |

---

## Reporting a Vulnerability

Please do not publicly disclose security vulnerabilities in issues or discussions.

If you discover a vulnerability, please contact the maintainer privately.

Recommended information to include:

- Description of the issue.
- Steps to reproduce.
- Potential impact.
- Screenshots or logs if helpful.
- Suggested fix if known.

---

## Security Guidelines

This project should not expose:

- API keys.
- Tokens.
- Credentials.
- Private environment variables.
- Sensitive user data.

Environment variables should be managed through the deployment platform, such as Vercel.

---

## Live Data and External APIs

The app may rely on external football data APIs.

Security considerations include:

- Keeping API keys server-side.
- Avoiding direct exposure of secrets in frontend code.
- Validating external responses where practical.
- Handling failed or incomplete API responses gracefully.

---

## Responsible Disclosure

The maintainer will review reported issues and prioritize fixes based on severity and project impact.
