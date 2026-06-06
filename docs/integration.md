# Identity and External Integration

Sentinel is designed to connect to authorized external providers only.

## Supported verification flows

- Fingerprint verification
- Facial recognition verification
- National ID verification

## Rules

- Require officer authorization before any request
- Log every request and response status
- Do not store raw biometric templates
- Store only verification metadata and outcomes

## Recommended interface

- REST or signed HTTP callback API
- Provider request IDs
- Audit log correlation IDs
- Replay-safe request handling
