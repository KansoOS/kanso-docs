# Architecture

KansoOS is designed as a portable product layer with platform-specific adapters.

```text
KansoOS Product Layer
├── Launcher
├── Policy Engine
├── Sync Client
├── Caregiver Dashboard
├── Backend API
└── Audit Model

Platform Adapter
├── Android Enterprise Adapter
└── AOSP/System Adapter
```

## Main Components

### Launcher

The launcher is the primary user interface. It should expose only the actions approved by the active policy.

### Policy Engine

The policy engine owns the rules model. It must not depend directly on Android Enterprise or AOSP internals.

### Device Agent

The device agent synchronizes policies, reports device state, and applies platform-specific restrictions through an adapter.

### Backend

The backend manages users, devices, caregiver access, policies, and audit logs.

### Dashboard

The dashboard lets caregivers configure rules without directly handling the device.

## Adapter Strategy

Business rules must remain platform-independent.

Example:

```text
Rule: only these apps are allowed.

Android Enterprise implementation:
- apply app allowlist through Device Owner policies.

AOSP implementation:
- enforce allowlist through privileged system app or framework integration.
```

