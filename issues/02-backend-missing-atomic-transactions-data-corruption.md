# Backend Data Corruption Risk: No Atomic Transactions Across Multi-Document Operations in Critical Controllers

## Description

Multiple controllers in the backend perform operations that span multiple documents/collections without wrapping them in MongoDB transactions. If any operation fails mid-way, the system is left in an inconsistent state — documents are partially created, counters are not updated, or points are awarded without corresponding badges. Additionally, several controllers use read-then-write patterns (instead of atomic operators) for updates, causing race conditions under concurrent requests.

## Bug 1: Badge Awarding — UserBadge Created but Points Update May Fail

**File:** `backend/src/controllers/badgeController.ts`, lines 66–123

```typescript
const userBadge = new UserBadge({...});
await userBadge.save();                                   // Step 1
await User.findByIdAndUpdate(userId, {                    // Step 2
  $inc: { certificatesEarned: 1 }
});
```

**Problem:** If Step 2 fails (e.g., network error, validation failure), the `UserBadge` document is already persisted. The user's `certificatesEarned` counter falls out of sync. A retry would create a duplicate badge; no retry means the badge exists but the counter is never incremented.

**Same issue exists in:** `userController.ts` line 391: badge auto-awarding after streak update uses the same pattern.

## Bug 2: Certificate Creation — Certificate Saved but User Counter Not Updated Atomically

**File:** `backend/src/controllers/certificateController.ts`, lines 65–83

```typescript
const certificate = new Certificate({...});
await certificate.save();                                 // Step 1
await User.findByIdAndUpdate(userId, {                    // Step 2
  $inc: { certificatesEarned: 1 }
});
```

**Problem:** Same as Bug 1. If the User update fails, a certificate exists but the count on the User document is stale.

## Bug 3: Peer Review Submission — Review Created, Scores Updated, Points Awarded, All Without Atomicity

**File:** `backend/src/controllers/peerReviewController.ts`, lines 49–83

The peer review submission performs multiple state-changing operations:
1. Creates a new `PeerReview` document
2. Updates the reviewee's average score (read → modify → save pattern)
3. Awards points to both reviewer and reviewee
4. Potentially triggers badge auto-awarding

**Problem:** None of these steps are wrapped in a transaction. If Step 2 fails after Step 1 succeeds, the review is recorded but scores are wrong. If the server crashes after Step 1 but before Step 2, the data is permanently inconsistent.

## Bug 4: Registration Creates Notifications for Past Webinars

**File:** `backend/src/controllers/authController.ts`, lines 215–235

```typescript
const webinars = await Webinar.find({});                  // Fetches ALL webinars
const notifications = webinars.map(w => ({
  recipient: newUser._id,
  type: 'webinar_reminder',
  message: `New webinar: ${w.title}`,
}));
await Notification.insertMany(notifications);             // Creates notifs for PAST webinars too
```

**Problem:** When a new intern registers, the code fetches ALL webinars (past and future) and creates notifications for each one. A user registering in 2026 would get notifications about webinars from 2025 that have already ended. The query should filter for future webinars only (`{ date: { $gte: new Date() } }`). This is also not in a transaction with the user creation.

## Bug 5: Streak Calculation Uses Read-Then-Write, Not Atomic Operations

**File:** `backend/src/controllers/userController.ts`, lines 362–394

```typescript
const user = await User.findById(userId);                 // Read
if (todayActivity) {
  user.streak += 1;                                       // Modify in memory
  if (user.streak > user.longestStreak) {
    user.longestStreak = user.streak;
  }
} else {
  user.streak = 0;
}
await user.save();                                        // Write
```

**Problems:**
1. **Race condition:** If two concurrent requests call this function, both read the same streak value (e.g., 5), both increment to 6, and both save. The result is streak=6 instead of streak=7. Should use `$inc: { streak: 1 }` and `$max: { longestStreak: streak }` operators atomically.
2. **Duplicate increment bug:** The check `todayActivity` is true if there's ANY activity today. If the function is called twice on the same day, the streak increments both times (from 5 to 6 to 7) instead of remaining at the correct value. The logic should differentiate between "last activity was yesterday" (increment) vs "already active today" (maintain).

## Bug 6: Follow/Unfollow Uses Non-Atomic Read-Then-Write

**File:** `backend/src/controllers/userController.ts`, lines 654–703

```typescript
const me = await User.findById(myId);                     // Read
const other = await User.findById(userId);                // Read
// modify arrays
me.following.push(userId);
other.followers.push(myId);
await me.save();                                          // Write
await other.save();                                       // Write
```

**Problem:** If two users follow the same target simultaneously, both reads get the same followers array, both append their ID, and the second save overwrites the first. One follower's ID is lost. Should use `$addToSet`/`$pull` atomic operators.

## Bug 7: Case Creation + Intern Notifications Not Atomic

**File:** `backend/src/controllers/caseController.ts`, lines 112–116

After creating a new medical case, the controller sends notifications to all registered interns. If the notification batch insertion fails, the case exists but interns never learn about it. Should be wrapped in a transaction.

## Tasks

1. **Install `mongodb` driver for session support** (Mongoose transactions require the native MongoDB driver's `ClientSession`):
   - `backend/src/utils/database.ts`: Ensure the MongoDB connection exposes a `client` that can start sessions

2. **`backend/src/controllers/badgeController.ts`:**
   - Wrap `UserBadge.save()` and `User.findByIdAndUpdate(...)` in a Mongoose transaction using `session`
   - Lines ~66–123

3. **`backend/src/controllers/certificateController.ts`:**
   - Wrap `Certificate.save()` and `User.findByIdAndUpdate(...)` in a transaction
   - Lines ~65–83

4. **`backend/src/controllers/peerReviewController.ts`:**
   - Wrap the review creation, score update, and point award in a transaction
   - Lines ~49–83

5. **`backend/src/controllers/authController.ts`:**
   - Filter the webinar query to only fetch future webinars: `Webinar.find({ date: { $gte: new Date() } })`
   - Lines ~215–235

6. **`backend/src/controllers/userController.ts`:**
   - Replace streak read-then-write with `User.findByIdAndUpdate(userId, { $inc: { streak: 1 }, $max: { longestStreak: streak } })` using conditions
   - Add logic to check if last activity was yesterday vs today to prevent double-counting
   - Lines ~362–394
   - Replace follow/unfollow read-then-write with `$addToSet`/`$pull` atomic operators
   - Lines ~654–703

7. **`backend/src/controllers/caseController.ts`:**
   - Wrap case creation and intern notification in a transaction
   - Lines ~112–116

8. **Add tests:**
   - Test concurrent streak updates to verify atomicity
   - Test concurrent follow/unfollow operations
   - Test certificate creation with simulated failure mid-transaction
