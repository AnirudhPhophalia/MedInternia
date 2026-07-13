# Frontend: Session Data Persists After Logout, JWT Stored in localStorage Without Centralized Auth Management, and Stale Profile Data Across the Application

## Description

The frontend has three interconnected critical issues: (1) logging out does not clear all session-related keys from localStorage, leaving user data exposed to the next person using the same machine; (2) the JWT token and full user object (including PII) are stored in `localStorage` without centralized auth state management, forcing 15+ components to independently read/write `localStorage` — this is both a security risk (XSS → token theft) and a maintainability nightmare; and (3) profile data across components becomes stale because there is no shared auth context and useEffect dependency arrays are empty.

## Bug 1: Logout Does Not Clear All Session Data from localStorage

**File:** `frontend/components/ProfileDropdown.tsx`, lines 45–52

```typescript
const logout = () => {
  localStorage.removeItem("authToken");   // This key is NEVER set — dead code
  localStorage.removeItem("token");
  // Missing: localStorage.removeItem("userId");
  // Missing: localStorage.removeItem("user");
  // Missing: localStorage.removeItem("starredCases");
  // Missing: localStorage.removeItem("starredPapers");
  // Missing: localStorage.removeItem("pinnedPapers");
  handleClose();
  onNavigate("/");
};
```

**Problems:**
1. `"authToken"` is removed but never stored — dead code
2. `"userId"` is never removed — the next user logging in on the same machine will see the previous user's ID
3. `"user"` (full user object including PII) is never removed — medical PII persists
4. `"starredCases"`, `"starredPapers"`, `"pinnedPapers"` are never cleared — preference data leaks

**Impact:** After logging out on a shared machine, the next user inherits the previous user's ID, starred items, and personal data. This is both a privacy violation and a functional bug (e.g., the "My starred cases" page shows the previous user's data).

## Bug 2: JWT and User PII Stored in localStorage — XSS-Vulnerable Pattern

**Files (15+ locations):**
- `frontend/utils/api.ts:22` — `localStorage.getItem('token')` for API auth headers
- `frontend/utils/permissions.ts:106` — reads token for role decoding
- `frontend/hooks/useNotifications.ts:32` — reads token for socket connection auth
- `frontend/pages/auth/register.tsx:341–343` — stores token, userId, and full user object
- `frontend/pages/auth/profile.tsx:13` — reads token
- `frontend/components/Navbar.tsx:159–160` — reads token and userId
- `frontend/components/CaseCard.tsx:43` — reads starredCases from localStorage
- `frontend/components/ResearchPaperCard.tsx:16` — reads starredPapers
- `frontend/pages/jobs.tsx:41` — reads user object
- And many more...

**Problems:**
1. JWT in localStorage is accessible to any JavaScript running on the page — an XSS vulnerability in any component exposes all user tokens
2. Full user object (including email, phone, address, medical history) stored in plaintext in localStorage
3. No centralized auth state — each component independently calls `localStorage.getItem('token')` and handles `null` differently
4. No try/catch around `JSON.parse` — corrupted localStorage throws uncatchable runtime errors (e.g., `CaseCard.tsx:43`, `ResearchPaperCard.tsx:16`)

**Impact:** Any XSS vulnerability anywhere in the app leads to full account compromise. With 15+ components accessing localStorage directly, the attack surface is large.

## Bug 3: Stale Profile Data Across Components

**File:** `frontend/components/Navbar.tsx`, lines 158–187

```typescript
useEffect(() => {
  const fetchProfile = async () => {
    // fetch profile...
  };
  fetchProfile();
}, []);  // <-- Empty dependency array — only runs on mount
```

**Problem:** The Navbar fetches the user's profile on component mount with an empty dependency array `[]`. If the user updates their profile (e.g., changes avatar, name, or bio), the Navbar continues to show stale data until a full page reload. This affects:
- `Navbar.tsx` — stale profile avatar and name
- `ProfileDropdown.tsx` — stale user info
- Any component reading from localStorage rather than refetching

## Bug 4: No Error Boundary — Unhandled Render Errors White-Screen the App

**File:** `frontend/pages/_app.tsx`

The root component has no React Error Boundary. If any component throws during render (e.g., a `JSON.parse` failure from corrupted localStorage), the entire app crashes to a white screen with no recovery.

## Bug 5: Global `user-select: none` Prevents Text Selection on Medical Education Platform

**File:** `frontend/styles/globals.css`, lines 1–6

```css
* {
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -moz-user-select: none;
}
```

**Problem:** Medical case studies, symptom descriptions, diagnosis information, and discussion content — the core educational material of the platform — cannot be selected, copied, or highlighted. This prevents doctors and students from:
- Copying medical terms for research
- Selecting and sharing specific case details
- Using screen readers effectively (accessibility issue)
- Taking notes by highlighting key information

## Tasks

1. **`frontend/components/ProfileDropdown.tsx`:**
   - Add removal of `userId`, `user`, `starredCases`, `starredPapers`, `pinnedPapers` in the logout function
   - Remove the dead `"authToken"` removal (this key is never set)
   - Lines ~45–52

2. **Create a centralized AuthContext:**
   - Create `frontend/context/AuthContext.tsx` with:
     - Provider that reads token/userId from localStorage on mount (or switches to httpOnly cookies)
     - `login(token, user)` / `logout()` methods that update both context state and localStorage
     - `user`, `isAuthenticated`, `isLoading` state
   - Register the provider in `frontend/pages/_app.tsx`

3. **Refactor all components to use AuthContext instead of raw localStorage:**
   - `frontend/utils/api.ts` — read token from AuthContext instead of localStorage
   - `frontend/utils/permissions.ts` — use AuthContext for token decoding
   - `frontend/hooks/useNotifications.ts` — get token from AuthContext
   - `frontend/components/Navbar.tsx` — use AuthContext for auth state
   - `frontend/pages/auth/register.tsx` — use AuthContext.login() after registration
   - All other components that access localStorage for auth

4. **`frontend/components/Navbar.tsx`:**
   - Add the user profile fetch as a dependency on authenticated user state (not empty `[]`)
   - Lines ~158–187

5. **Create an Error Boundary component:**
   - Create `frontend/components/ErrorBoundary.tsx`
   - Wrap the app in `frontend/pages/_app.tsx`

6. **`frontend/styles/globals.css`:**
   - Remove the global `user-select: none` rule
   - Replace with selective application to UI elements only (buttons, icons, nav items)

7. **Add try/catch to all `JSON.parse` calls on localStorage:**
   - `frontend/components/CaseCard.tsx:43`
   - `frontend/components/ResearchPaperCard.tsx:16`
   - `frontend/pages/jobs.tsx:41`
   - And any other locations using `JSON.parse(localStorage.getItem(...))`
