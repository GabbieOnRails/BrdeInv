# Security Specification - Lumina Invoice

## 1. Data Invariants
- An Invoice MUST belong to a valid UserProfile.
- An Invoice's `userId` field MUST match the authenticated user's UID and the path parameter `userId`.
- Invoices can only be deleted if they are NOT in 'paid' status.
- `createdAt` is immutable for both UserProfiles and Invoices.
- Only the owner (matching `userId`) can read, write, or list their data.

## 2. The "Dirty Dozen" Payloads (Targeting Rules)

### Identity & Spoofing
1. **The Hijacker**: Create an invoice in another user's path with your own `userId` in data.
2. **The Ghost**: Create an invoice in your path but with another user's `userId` in data.
3. **The Identity Thief**: Update another user's UserProfile by spoofing the path ID.

### Integrity & Immutability
4. **The Time Traveler**: Update an existing invoice's `createdAt` field.
5. **The Money Launderer**: Update a 'paid' invoice to change the `totalAmount`.
6. **The Shadow Field**: Add a `verified: true` field to a UserProfile (not in schema).

### State & Access Control
7. **The Terminator**: Delete a 'paid' invoice.
8. **The Peeper**: List invoices from another user's collection.
9. **The Rule Bender**: Create a UserProfile with a 1MB string in `businessName`.

### Resource Exhaustion
10. **The ID Poison**: Create an invoice with a 2KB junk string as the document ID.
11. **The List Bomber**: Create an invoice with 1000 items (limit is 50).
12. **The Unverified Sniper**: Attempt any write operation with an unverified email account.

## 3. Test Runner
Refer to `firestore.rules.test.ts` for automated verification of these payloads.
