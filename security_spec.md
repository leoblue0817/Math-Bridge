# Firestore Security Specification (Payload-First TDD)

## 1. Data Invariants
1. A battle room document ID `{roomId}` must strictly match `^[A-Z2-9]{6}$` and equal `data.roomCode`.
2. `hostUid` must equal `request.auth.uid` on creation and remain immutable forever; `createdAt` must equal `request.time` on creation and remain immutable forever.
3. Only `waiting` rooms with `guestUid == ""` can be joined by a different signed-in verified user, transitioning `status` to `playing` and setting `guestUid = request.auth.uid`.
4. During `playing`, Host may only mutate Host progress fields (`hostScore`, `hostAnsweredCount`, `hostCorrectCount`, `hostLastCorrect`, `updatedAt`) OR Host round-progression fields (`currentIndex`, `status`, `winnerUid`, `updatedAt`); Guest may only mutate Guest progress fields (`guestScore`, `guestAnsweredCount`, `guestCorrectCount`, `guestLastCorrect`, `updatedAt`).
5. Once `status == 'finished'`, the document is terminally locked and cannot be updated.
6. No PII (`email`, `phone`, etc.) is stored in `battleRooms`, and `list` queries are restricted strictly to documents where `resource.data.hostUid == request.auth.uid || resource.data.guestUid == request.auth.uid`.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Create**: `auth = null` attempting to create `/battleRooms/ABC234`.
2. **Host Identity Spoofing**: User B attempting to create `/battleRooms/ABC234` with `hostUid = User A`.
3. **Shadow / Ghost Field Injection**: Creating room with extra `isVerifiedAdmin: true` field (blocked by `keys().hasOnly(...)`).
4. **Oversized ID / Path Poisoning**: Accessing `/battleRooms/<200-char-id>` (blocked by `isValidRoomId()`).
5. **Client Timestamp Forgery**: Creating/updating with client `Date.now()` instead of `request.time`.
6. **Non-Empty Initial Guest**: Creating a room with `guestUid = "someone"` or `status = "playing"` directly.
7. **Self-Join Duel**: Host attempting to join their own waiting room as `guestUid`.
8. **Score Tampering Cross-Write**: Guest attempting to update `hostScore` or `currentIndex` during `playing`.
9. **Score Bounds Poisoning**: Setting `hostScore = 999999` or negative score `-50` (blocked by `0..5000` check).
10. **Terminal State Mutation**: Attempting any `update` after `status == 'finished'`.
11. **Blanket Collection Scraping**: Authenticated user calling `list` on `/battleRooms` without `hostUid`/`guestUid` matching `request.auth.uid`.
12. **Unbounded Array / Type Poisoning**: Creating room with `questionIds` of 50 items or `questionSeconds = "20"` string.
