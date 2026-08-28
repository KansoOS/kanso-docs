# Security

KansoOS handles sensitive usage and caregiver-control data. Security must be treated as a product requirement, not as an afterthought.

## Security Principles

- Least privilege for every account and service.
- No shared personal accounts for critical infrastructure.
- Two-factor authentication on all critical accounts.
- Secrets stored only in the team password manager.
- Caregiver actions must be auditable.
- Device control must be revocable.

## Initial Threats

- Caregiver account compromise.
- Lost or stolen managed device.
- Backend API token leakage.
- Misconfigured policy locking a user out of essential actions.
- Unauthorized caregiver access.
- Secrets committed to Git.

## Required Controls

- Bitwarden organization for shared credentials.
- At least two admins for critical accounts.
- GitHub branch protection before active development.
- Secret scanning enabled where available.
- Separate dev/staging/prod environments when backend work begins.
- Recovery procedure for Android Enterprise and Google accounts.

## Regulatory Position

The MVP is positioned as an accessibility and autonomy-support product, not as a medical device.

The project must avoid medical claims such as diagnosis, treatment, symptom reduction, or clinical monitoring unless a dedicated regulatory track is opened later.

