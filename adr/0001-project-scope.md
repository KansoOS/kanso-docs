# ADR 0001 - Project Scope

## Status

Accepted

## Context

KansoOS aims to support neuroatypical users through a simplified and secure smartphone environment. A full custom Android OS is technically attractive but carries high risks: device support, Google Mobile Services compatibility, banking app compatibility, maintenance burden, and build infrastructure complexity.

## Decision

The MVP will focus on a managed Android experience based on Android Enterprise, a custom launcher, a device agent, a backend, and a caregiver dashboard.

AOSP customization remains a separate research and future integration track.

## Consequences

- The project can deliver value earlier.
- The product remains compatible with certified Android devices.
- The architecture must isolate business rules from platform enforcement.
- The team can still explore deeper AOSP integration without making it a blocker.

