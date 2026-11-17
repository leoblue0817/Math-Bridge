# Firestore Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Battle Rooms (`/battleRooms/{roomId}`)**: Document ID `{roomId}` must match `^[A-Z2-9]{6}$` and equal `data.roomCode`. `hostUid` must equal `request.auth.uid` on create and remain immutable forever. Phase transitions (`waiting` -> `question` -> `reveal` -> `finished`) and `leaderboard`/`optionCounts`/`answeredCount` aggregation can only be executed by `hostUid`. Once `status == 'finished'`, the document is terminally locked.
2. **Battle Players Subcollection (`/battleRooms/{roomId}/players/{playerUid}`)**: Document ID `{playerUid}` must equal `request.auth.uid` and `data.uid`. On create, `data.hostUid` is verified against the parent room's `hostUid` via `get()`, score/counts start at `0`, and `lastRoundIndex == -1`. Updates are only permitted by the player themselves while the parent room's `status == 'question'`, incrementing `answeredCount` by `1` and advancing `lastRoundIndex` strictly forward, with per-round score gain bounded `<= 1500`.
3. **Battle Questions Subcollection (`/battleRooms/{roomId}/questions/{qIdx}`)**: Only created atomically by `hostUid` (`getAfter` verifies room ownership), immutable once written, and readable by signed-in room participants via `roomCode == roomId`.
4. **Cross-Device User Data (`/userData/{userId}`) & Custom Questions (`/userData/{userId}/customQuestions/{questionId}`)**: Strictly isolated to `request.auth.uid == userId`. `list` on `/userData` is denied (`false`); `list` on `customQuestions` enforces `resource.data.uid == request.auth.uid`.
5. **Zero PII in Shared Collections**: Email addresses and personal contact info are never written to `battleRooms`, `players`, or `questions`.
6. **Temporal & Size Bounds**: Every `createdAt`/`updatedAt` field mandates `request.time`; every string and list enforces explicit `.size()` ceilings.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Create**: `auth = null` attempting to create `/battleRooms/ABC234` or `/userData/uid1`.
2. **Host Identity Spoofing**: User B attempting to create `/battleRooms/ABC234` with `hostUid = User A`.
3. **Player Score Tampering / Cross-Write**: Player A attempting to write `/battleRooms/ABC234/players/PlayerB` or set `score = 99999` in a single round.
4. **Shadow / Ghost Field Injection**: Creating/updating any document with extra `isAdmin: true` field (blocked by `keys().hasOnly(...)`).
5. **Double-Answer Replay**: Player updating their own doc twice for the same `lastRoundIndex` or while room `status == 'reveal'`.
6. **Non-Host Phase Override**: Joined player attempting to set `battleRooms/{roomId}.status = 'finished'` or `currentIndex += 1`.
7. **Terminal State Mutation**: Any update to a `battleRooms` document or its `players` subcollection after `status == 'finished'`.
8. **Client Timestamp Forgery**: Providing `Date.now()` instead of `request.time` for `createdAt` or `updatedAt`.
9. **Cross-User Data Scraping**: User B calling `get` or `list` on `/userData/UserA` or `/userData/UserA/customQuestions`.
10. **Blanket BattleRoom Listing**: Authenticated non-host calling `list` on `/battleRooms` without `hostUid == request.auth.uid`.
11. **Oversized Image/Text Injection**: Submitting a 2MB string into `imageUrl` or `q` (blocked by `.size()` checks).
12. **Player HostUid Spoof**: Player creating a `players/{uid}` doc with a forged `hostUid` not matching parent room `hostUid` (blocked by `get()` Master Gate).
