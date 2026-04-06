

## Plan: Fix "Add New User" Functionality

### Root cause

Two issues:

1. **Email invites require SMTP configuration** — The edge function uses `inviteUserByEmail`, which tries to send an email. Lovable Cloud doesn't have SMTP configured by default, so the invite silently fails or errors.

2. **Error handling is broken** — `supabase.functions.invoke()` puts HTTP 400 responses in `data`, not `error`. So when the edge function returns `{ error: "..." }` with status 400, the client code doesn't catch it — the toast never shows the real error.

### Solution

**Switch from email invite to direct user creation with a password.**

Instead of inviting by email (which requires SMTP), the admin will set an initial password when creating a user. The edge function will use `adminClient.auth.admin.createUser()` instead of `inviteUserByEmail()`.

### Changes

**1. Edge function (`supabase/functions/admin-users/index.ts`)**
- Replace `inviteUserByEmail` with `createUser` in the `invite` action
- Accept a `password` field in the request body
- Create user with `email_confirm: true` so they can log in immediately

**2. UI (`src/components/UserManagement.tsx`)**
- Add a password field to the "Register New User" dialog
- Require both email and password before submitting
- Send password in the request body
- Fix error handling: check `data?.error` in addition to `error` from `functions.invoke()`

### Updated invite flow

```text
Admin fills: email + name + role + password
  → Edge function: createUser(email, password, email_confirm: true)
  → Insert profile + role
  → New user can log in immediately with email/password
```

### Technical details

Edge function change (invite action):
```typescript
const { data: created, error: createError } = await adminClient.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName || email },
});
```

Client error handling fix:
```typescript
const { data, error } = await supabase.functions.invoke('admin-users', { body: { ... } });
if (error) throw error;
if (data?.error) throw new Error(data.error);
```

