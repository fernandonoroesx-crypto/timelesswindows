

## Plan: Add Project Managers to Client Registration

### What Changes

Add a **Project Managers** section inside the client form where users can add multiple project managers (name, email, phone) per client. The client card in the list will also show the assigned project managers.

### Technical Changes

1. **`src/lib/types.ts`** — Add a `ProjectManager` interface (`id`, `name`, `email`, `phone`) and add `projectManagers: ProjectManager[]` to the `Client` interface.

2. **`src/pages/ClientsPage.tsx`**:
   - Add `projectManagers` array to the form state (default `[]`)
   - Inside the client form, below the existing fields, add a "Project Managers" sub-section:
     - Small inline form (name, email, phone) with an "Add" button
     - List of already added managers with delete buttons
   - When editing a client, load existing project managers into the form
   - Display project manager names in the client list cards (e.g., "PM: John, Sarah")

3. **`src/lib/context.tsx`** — Update `resetForm` defaults to include `projectManagers: []`. No other context changes needed since `setClients` already handles the full client object.

