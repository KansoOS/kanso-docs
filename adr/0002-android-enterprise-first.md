# ADR 0002 - Android Enterprise First

## Status

Accepted

## Context

KansoOS needs strong device control while preserving Android ecosystem compatibility. A 100% custom ROM may break Play Integrity expectations and sensitive applications such as banking apps.

Android Enterprise provides Device Owner policies, dedicated-device behavior, app restrictions, remote management, and compatibility with certified Android devices.

## Decision

KansoOS will use Android Enterprise as the first deployment platform.

The product logic will be implemented through a platform-independent policy model and a platform adapter.

## Consequences

- Initial deployment is more realistic.
- Future AOSP migration remains possible.
- The team must avoid coupling backend policies directly to Android Management API payloads.
- The device agent must expose stable internal interfaces for policy application.

