# Coffee Shop Reopening Hub

## Current State
- The app is labeled "Reopening Manager" in the sidebar, login page, WhoAreYou screen, and dashboard heading.
- Task categories are hardcoded as a TypeScript enum (`TaskCategory`) with five fixed values: equipment, staffing, marketing, cleaning, permits. Users cannot add or remove categories.
- Unit conversion for ingredients/recipes was just added (already complete).

## Requested Changes (Diff)

### Add
- **Custom task category management**: A "Manage Categories" button on the Tasks page that opens a dialog where users can add new custom categories (free-text) and remove existing ones. Custom categories are stored in `localStorage` so they persist across sessions without requiring backend changes. The category select in the Add/Edit Task dialog and the filter dropdown must reflect the full list (built-in + custom).

### Modify
- **Rename "Reopening Manager" to "Pop-Up Manager"** everywhere it appears:
  - `App.tsx`: sidebar wordmark subtitle and WhoAreYou screen subtitle
  - `Login.tsx`: left panel subtitle, mobile wordmark subtitle, and sign-in description text
  - `Dashboard.tsx`: page heading "Reopening Status" → "Pop-Up Status"
- **Tasks.tsx**: 
  - Add a "Manage Categories" button near the filter area (small, secondary style)
  - Add a category management dialog: shows list of all categories with delete buttons (cannot delete built-in ones), plus an input + add button to create new ones
  - Custom categories are stored in `localStorage` under key `alldaymia_custom_categories` as a JSON array of strings
  - The category filter dropdown and the task form category select both include custom categories
  - Tasks that have a custom category string show that string as their label (fallback for unknown enum values)

### Remove
- Nothing removed.

## Implementation Plan
1. In `App.tsx`: replace all 2 instances of "Reopening Manager" with "Pop-Up Manager".
2. In `Login.tsx`: replace "Reopening Manager" (×2) and "Your reopening, organized." and "Access your reopening dashboard..." with Pop-Up equivalents.
3. In `Dashboard.tsx`: replace "Reopening Status" with "Pop-Up Status".
4. In `Tasks.tsx`:
   - Add `useCustomCategories` hook-like logic (useState + localStorage init) that merges built-in `categoryLabels` with custom categories.
   - Add "Manage Categories" secondary button in the filter row header area.
   - Add a `CategoryManagerDialog` component: lists all built-in + custom categories, built-ins show a lock icon (no delete), custom ones show a trash button. Has an input + "Add" button. Saves to localStorage on every change.
   - Update the category filter `<Select>` and the task form category `<Select>` to use the merged list.
   - For display (badge in task list), fall back to the raw string if the category isn't in the built-in enum.
5. Validate: typecheck, lint, build pass.
