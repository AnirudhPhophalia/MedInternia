## CRITICAL: Comment rating system silently corrupts all user averages — mathematically broken unrate formula in `caseController` compounded by route shadowing that makes the correct `enhancedController` implementation unreachable dead code

**Severity:** Critical  
**Affects:** `backend/src/controllers/caseController.ts`, `backend/src/controllers/enhancedController.ts`, `backend/src/routes/api.ts`  
**Impact:** Complete corruption of the user rating/gamification system — leaderboard, intern scoring, doctor reputation, and badge criteria all rely on corrupted averages.  
**Unique:** Not reported in any existing open/closed issue (#1 through #109).

---

### Overview

This is a **multi-layered architectural and mathematical bug** with three interconnected problems that compound into total data corruption of the entire user rating system:

1. **Mathematically broken average recalculation** — the unrate formula is fundamentally wrong
2. **Route shadowing** — the correct implementation is unreachable dead code
3. **Structural design mismatch** — the data model cannot support toggle-based averaging

---

### Problem 1 — Mathematically broken average recalculation on unrate

**File:** `backend/src/controllers/caseController.ts`, lines 115–127

```typescript
// UNRATE path (lines 115-120)
comment.ratedBy.splice(rateIndex, 1); // ← ID removed
if (comment.ratedBy.length === 0)
  comment.rating = undefined; // fine
else
  comment.rating = Math.round(
    // ← WRONG
    ((comment.rating ?? 0) * comment.ratedBy.length) /
      (comment.ratedBy.length + 1),
  );

// RATE path (lines 124-126)
comment.ratedBy.push(userIdObj); // ← ID added
if (!comment.rating) comment.rating = rating;
else
  comment.rating = Math.round(
    // ← drifts from rounding
    (comment.rating * (comment.ratedBy.length - 1) + rating) /
      comment.ratedBy.length,
  );
```

**Why the unrate formula is mathematically wrong:**

| Variable | Meaning                           |
| -------- | --------------------------------- |
| `n`      | number of raters before unrate    |
| `S`      | sum of all individual ratings     |
| `r`      | the specific rating being removed |

Before unrate: `n` raters, stored average `A = S/n` (approximately, since `A` is rounded).  
After splice: `n-1` raters remain. The correct new average should be `(S - r) / (n-1)`.

**What the code computes:** `A * (n-1) / n` = `(S/n) * (n-1) / n` = **`S(n-1) / n²`**  
**What it should compute:** **`(S - r) / (n-1)`**

These are **not equal**. Since `comment.ratedBy` only stores an array of `ObjectId` (user IDs) with **no per-user rating values**, the correct average `(S - r)` **cannot be computed**.

**Concrete example:**

1. Doctor A rates intern comment: 5 stars. `ratedBy = [A]`, `rating = 5`
2. Doctor B rates same comment: 4 stars. `ratedBy = [A, B]`, `rating = Math.round((5+4)/2) = 5`
3. Doctor B unrates. `ratedBy = [A]`, **code computes**: `Math.round(5 * 1 / 2) = 3`
4. **Correct value should be**: `5` (only Doctor A's rating remains)

The rating drifted from 5 to 3 with a single unrate cycle. Repeating rate/unrate cycles makes the value drift further each time.

**The RATE path also accumulates rounding errors.** Since `comment.rating` is a rounded integer, the old sum reconstruction `comment.rating * (oldLength)` is off by up to `(oldLength/2)` points per cycle. Over many rate/unrate toggles, this error compounds.

---

### Problem 2 — Route shadowing makes the correct implementation unreachable

The project contains **two** `rateComment` implementations with fundamentally different designs:

| Aspect        | `caseController.rateComment` (lines 95-135)           | `enhancedController.rateComment` (lines 8-128)     |
| ------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Who can rate  | **Any authenticated user**                            | **Doctors only**                                   |
| Storage       | Toggle on comment sub-document (no audit trail)       | Permanent `Rating` collection document             |
| Points        | **None awarded**                                      | Points awarded to intern (`rating * 2` by default) |
| Unrate        | Allowed (with broken math)                            | Not allowed (one rating per doctor per comment)    |
| Avg recompute | From the corrupted `rating` field using wrong formula | From all persisted `Rating` documents (accurate)   |

Both are registered at the **exact same URL path**, but due to route ordering in `api.ts`, the correct version is **never invoked**:

```typescript
// backend/src/routes/api.ts

router.use("/cases", caseRoutes); // line 67 — matched FIRST
// ...
router.use("/", enhancedRoutes); // line 77 — matched SECOND
```

**Why this shadows the enhanced routes:**

Both `enhancedRoutes` and `caseRoutes` define handlers for `POST /cases/:caseId/comments/:commentId/rate` (and likewise for `/reply` and `/like`). When a request arrives:

1. Express matches `caseRoutes` first (registered at line 67, bound to `/cases`)
2. The `caseController.rateComment` handler executes and sends `res.json()` — completing the request-response cycle
3. Express **never proceeds** to `enhancedRoutes` (registered at line 77)

**Impact:** `enhancedController.rateComment`, `enhancedController.replyToComment`, and `enhancedController.likeComment` are all **unreachable dead code**. The superior doctor-only rating system (with point awarding and audit trail) can never execute.

---

### Problem 3 — Structural design mismatch

The `Case` model defines `ratedBy` as **`mongoose.Types.ObjectId[]`** — a plain array of user IDs:

```typescript
// backend/src/models/Case.ts:84-87
ratedBy: [{
  type: Schema.Types.ObjectId,
  ref: 'User'
}],
```

This data structure **cannot support toggle-based averaging** because:

- It stores no per-user rating values
- When a user unrates, their rating value is lost forever
- The average cannot be correctly recomputed

The correct design (which `enhancedController` uses) stores rating data in a separate `Rating` collection with full schema:

```typescript
// backend/src/models/Rating.ts
{
  rater: ObjectId,      // who rated
  ratee: ObjectId,      // who was rated
  caseId: ObjectId,     // the case
  commentId: ObjectId,  // the comment
  rating: Number,       // 1-5
  pointsAwarded: Number // points given
}
```

This design enables correct average recomputation from persisted records — but it can never be used because `enhancedController` is unreachable.

---

### Root Cause Summary

| Layer            | Problem                                                                                                  | File:Line                   |
| ---------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Architecture** | `enhancedRoutes` mounted at `/` **after** `caseRoutes` at `/cases` — shadowing 3 identical route paths   | `api.ts:67,77`              |
| **Mathematics**  | Unrate formula `rating × (n-1) / n` produces `S(n-1)/n²` instead of correct `(S-r)/(n-1)`                | `caseController.ts:119-120` |
| **Data model**   | `ratedBy: ObjectId[]` cannot support toggle averaging; needs `{userId, rating}[]` or separate collection | `Case.ts:84-87`             |
| **Rounding**     | RATE path uses rounded `comment.rating` as approximate sum, causing compounding error per cycle          | `caseController.ts:126`     |

---

### Reproduction Steps

1. Register a doctor and an intern
2. Doctor creates a case; intern posts a comment
3. Doctor rates the comment `5` → `rating = 5`
4. Doctor unrates → code computes `Math.round(5 * 0 / 1)` → wait, after splice `length=0`, so `rating = undefined`
5. Doctor rates again `5` → `Math.round(((0 * 0) + 5) / 1) = 5` (lucky, this case works because length=1)
6. Doctor B rates `4` → `Math.round(((5 * 1) + 4) / 2) = Math.round(4.5) = 5` (slight rounding drift starts)
7. Doctor B unrates → `Math.round(5 * 1 / 2) = Math.round(2.5) = 3` **← CORRUPTED** (correct: 5)
8. Repeat steps 6-7 with various ratings → rating drifts further from true average each cycle

---

### Impact Assessment

| Affected System         | How                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Intern leaderboard**  | Sorted by `points` then `averageRating` — ratings are corrupted                     |
| **Gamification badges** | Badge criteria like `upvotes_received` thresholds based on unreliable data          |
| **Doctor reputation**   | Doctor comment ratings are unreliable                                               |
| **Intern scorecard**    | `performanceMetrics.averageRating` is corrupted                                     |
| **Peer review system**  | `averageRating` on User model is overwritten by corrupted values                    |
| **Upgrade profile**     | Intern-to-doctor promotion (when implemented correctly) would use corrupted metrics |

---

### Suggested Fix Strategy

**Short-term fix (prevent data corruption):**

- Fix the unrate formula or disable unrating entirely by removing the toggle: make `rateComment` one-directional (rate only, no unrate)
- Alternatively, store individual `{userId, rating}` pairs in the comment subdocument instead of bare `ObjectId[]`

**Medium-term fix (enable correct implementation):**

- Resolve the route shadowing by either:
  - Removing the overlapping routes from `caseRoutes` (keeping only `enhancedRoutes`)
  - Moving `enhancedRoutes` mounting before `caseRoutes` in `api.ts`
  - Mounting `enhancedRoutes` at `/cases/enhanced/...` to avoid path collision
- Enable `enhancedController.rateComment` which uses the `Rating` collection for correct, auditable rating storage

**Data migration:**

- Write a migration script that recomputes all comment averages from the `Rating` collection documents to repair corrupted data
