# Security Policy

## Supported Branch
- main: supported

## Reporting a Vulnerability
Please do not open a public issue for security vulnerabilities.

Report privately to the repository maintainers and include:
1. Description
2. Steps to reproduce
3. Impact
4. Suggested mitigation

## Secrets
- Never commit .env files.
- Store JWT and database credentials in GitHub Actions Secrets.
- Rotate credentials immediately after any exposure.
