

## Plan: Persist Data with Supabase Cloud Database

### Problem
All clients, quotes, and settings are stored in **browser localStorage** — data is lost when clearing browser data, switching devices, or browsers.

### Solution
Connect Lovable Cloud (Supabase) to store clients and projects in a real database, synced across all devices.

### Technical Steps

1. **Enable Lovable Cloud** — Set up Supabase integration with database tables.

2. **Create database tables** via migrations:
   - `clients` — id, name, email, phone, address, notes, created_at
   - `project_managers` — id, client_id (FK), name, email, phone
   - `projects` — id, date, client, client_id, project_ref, settings (jsonb), pricing (jsonb), status, created_at, updated_at
   - `line_items` — id, project_id (FK), all line item fields

3. **Create a Supabase client** — `src/integrations/supabase/client.ts`

4. **Update `src/lib/context.tsx`**:
   - Replace `localStorage.getItem/setItem` calls with Supabase queries
   - Load clients and projects from database on app start
   - Save changes to database when `setClients` or `setProjects` are called
   - Keep localStorage as offline fallback/cache

5. **Add RLS policies** — Enable row-level security (initially open, tighten when auth is added later)

### What Stays the Same
- All UI components unchanged
- All pricing calculation logic unchanged
- Same app flow — just backed by a real database

### Result
Data persists permanently, accessible from any device/browser.

