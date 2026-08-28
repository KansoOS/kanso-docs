# MVP

The MVP must prove that KansoOS can provide a controlled, useful, and maintainable smartphone experience without requiring a fully custom ROM.

## Core Features

- Custom Android launcher with simplified navigation.
- Approved contacts.
- Simple agenda/routine display.
- Approved apps list.
- Local device policy enforcement through Android Enterprise where possible.
- Remote configuration from a caregiver dashboard.
- Basic audit trail for caregiver-side changes.

## Technical Scope

- Android Enterprise Device Owner as the first deployment target.
- Android launcher application.
- Device agent using platform adapters.
- Backend API for configuration and synchronization.
- Web dashboard for caregivers.

## Demo Target

The first demo should show:

1. A managed Android device booting into the KansoOS launcher.
2. A caregiver changing a rule from the dashboard.
3. The device receiving and applying that rule.
4. A limited set of contacts/apps visible to the user.

## Out Of Scope

- Full AOSP production ROM.
- OTA update infrastructure.
- Medical claims.
- Banking app certification guarantees.
- Large-scale fleet deployment.

