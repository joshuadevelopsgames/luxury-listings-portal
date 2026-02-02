# Dashboard Display Rules

This document defines **what gets displayed** on the dynamic dashboard and **how it relates** to enabled modules. Use it to keep the dashboard consistent and to add new modules or widgets.

---

## 1. How “enabled modules” are determined

- **Base modules** (always included): `time-off`, `my-clients`, `instagram-reports` (from `getBaseModuleIds()` in `src/modules/registry.js`).
- **User permissions**: Page IDs from Firestore `pagePermissions` (e.g. `tasks`, `clients`, `team`, `client-packages`, `content-calendar`, `crm`, `hr-calendar`, `hr-analytics`, `it-support`, `tutorials`, `resources`).
- **Effective enabled list**:  
  `enabledModules = baseModuleIds ∪ userPermissions`  
  (System admins get all module IDs; “View as” uses the viewed user’s permissions.)

The dashboard and sidebar both use this same notion of “enabled modules” so nav and widgets stay in sync.

---

## 2. “Your Modules” section (widget grid)

- **Source**: `WidgetGrid` in `src/components/dashboard/WidgetGrid.jsx` receives `enabledModules`.
- **Data**: Widgets come from `getWidgetsForModules(enabledModules)` in `src/modules/registry.js`. Each module can declare `widgets: ['widgetId1', 'widgetId2']`.
- **Rule**: Only widgets for **enabled** modules are shown. If a module has no `widgets` array (or it’s empty), it contributes no widgets.
- **Current widget mapping**:
  - `time-off` → `timeOffSummary`
  - `my-clients` → `clientOverview`, `deliverablesDue`
  - `instagram-reports` → `recentReports`
  - `tasks` → `tasksSummary`
- **Empty state**: If no enabled module has widgets, the section shows: *“No widgets available. Enable modules to see dashboard content.”*

**To add a new dashboard widget for a module:**  
1. Add the widget component under the module (e.g. `src/modules/<module>/widgets/<Name>Widget.jsx`).  
2. In `registry.js`, add the widget id to that module’s `widgets` array.  
3. In `WidgetGrid.jsx`, add a lazy import and an entry in `widgetComponents`.

---

## 3. Header actions (top right)

| Element              | Condition                         | Notes                          |
|----------------------|-----------------------------------|--------------------------------|
| “X Tasks” link       | `tasks` in `enabledModules`       | Links to `/tasks`.             |
| “Request Time Off”   | `time-off` in `enabledModules`    | Links to `/my-time-off`.       |

---

## 4. Quick Stats (metric cards)

- **Client stat** → shown only if `hasClientAccess`.  
  - If **full client access** (`clients` or `client-packages` in `enabledModules`): label **“Total Clients”**, value = all clients count.  
  - If **only my-clients** (no `clients`/`client-packages`): label **“My Clients”**, value = count of clients assigned to the current user (`assignedManager` matches user email or uid).
- **Pending Tasks**    → only if `tasks` enabled.
- **Due Today**       → only if `tasks` enabled.
- **Completed**       → only if `tasks` enabled.

Grid columns: 2 on small screens; if 3+ stats, use 4 columns on `md+`.

---

## 5. Main content blocks (unified grid, no empty cells)

Main content is a **single grid** (`lg:grid-cols-3`). Only **visible** blocks are rendered; they fill left-to-right with **no empty cells**. Span method: `MAIN_CONTENT_SPANS` in `Dashboard.jsx` (priorities: 2, others: 1).

| Block               | Condition                         | Span | Notes                                      |
|---------------------|---------------------|------|-----------------------------------------------------------------------|
| Today’s Priorities  | `tasks` enabled                   | 2 | Task list + “Add Task”; links to `/tasks`. |
| Monthly Deliverables | `hasClientAccess`                 | 1 | Deliverables to meet this month per client; data from contracts (coming soon). “View all” → `/clients` or `/my-clients`. |
| Upcoming Deadlines  | `tasks` enabled                   | 1 | Next 2 weeks.                              |
| Quick Links         | Always shown                      | 1 | Only links for enabled modules.           |
| Overview (blue card) | Always shown                      | 1 | Content depends on access (see below).     |

---

## 6. Quick Links (list in sidebar card)

Each link is shown only when the corresponding module is enabled:

| Link                | Module ID(s)        | Destination   |
|---------------------|---------------------|----------------|
| View All Clients    | `my-clients` or `clients` | `/my-clients` or `/clients` |
| Task Management     | `tasks`             | `/tasks`       |
| Team Directory      | `team`              | `/team`       |
| Resources & Docs    | `resources`         | `/resources`  |

If none of these are enabled, the Quick Links card can still be visible with no links (or we can hide the card when the list is empty—see “Future improvements”).

---

## 7. Quick Action tiles (Create Post, Schedule Content, etc.)

- **Rule**: Only show an action if its `moduleId` is in `enabledModules`.
- **Config** (in `Dashboard.jsx`):
  - Create Post       → `content-calendar`
  - Schedule Content  → `content-calendar` (same module; deduped by path so one tile per path).
  - Instagram Analytics → `instagram-reports`
  - Client Packages   → `client-packages`
- **Deduplication**: If two actions point to the same path (e.g. content-calendar), only one tile is shown for that path.
- **Layout**: Grid columns depend on number of tiles (1–4); section is hidden when there are no tiles.

---

## 8. Overview card (blue gradient)

- **Metrics**:
  - Client count / Premium Clients → only if `hasClientAccess`. Same rule as Quick Stats: **Total Clients** (all) when full access; **My Clients** (assigned count) when only my-clients. Premium count uses the same filtered list (all vs assigned).
  - Total Tasks / Completed       → only if `tasks` enabled.
- **Fallback**: If neither client nor tasks access: *“Enable Clients or Tasks to see metrics here.”*
- **CTA**: “View Clients” link only if `hasClientAccess`; destination `/clients` or `/my-clients` by access.

---

## 9. Client-related access

`hasClientAccess` is true if **any** of these are in `enabledModules`:

- `my-clients`
- `clients`
- `client-packages`

- **Full client access** (`hasFullClientAccess`): `clients` or `client-packages` in `enabledModules`. User sees **all** clients (Total Clients stat, Monthly Deliverables from full list, Overview total/premium).
- **Only my-clients** (`hasOnlyMyClients`): `my-clients` enabled but **not** `clients`/`client-packages`. User sees only **assigned** clients (My Clients stat, Monthly Deliverables from assigned list, Overview “My Clients” / premium from assigned list).

Use `hasClientAccess` for: showing Monthly Deliverables block, client stat, Overview client metrics, “View all” / “View Clients” links, and Quick Link “View All Clients”. Use `hasFullClientAccess` vs `hasOnlyMyClients` to choose label (“Total Clients” vs “My Clients”) and which client list to count/display.

---

## 10. Consistency with sidebar (Layout)

- The sidebar uses the **same** `enabledModules` logic (base + user permissions; admins see all).
- Nav items come from `getNavItemsForModules(enabledModules)` in the registry; only modules with a `navItem` appear.
- **Rule**: If a user can open a page from the nav, the dashboard should not show content that implies they can’t, and vice versa. So dashboard conditions use the same module IDs as the registry and Layout.

---

## 11. “View as” mode

- When an admin is “viewing as” another user, `effectiveUser` and `effectivePermissions` (or `viewAsPermissions`) are used.
- **Dashboard**: Uses `effectivePermissions` merged with base modules for `enabledModules`, so the dashboard reflects what **that user** would see.
- **Widgets and links**: Same rules as above; no special “admin override” on the dashboard for view-as.

---

## 12. Widget and section ordering (design rules)

### 12.1 Page order (top to bottom)

1. **Header** – Greeting, date, primary actions (Tasks link, Request Time Off).
2. **Quick Stats (metric cards)** – Client stat (Total Clients or My Clients), then Pending Tasks, Due Today, Completed. Order: client metric first when present, then task metrics left to right.
3. **Your Modules (widget grid)** – Dynamic widgets from enabled modules. Order: see 12.2.
4. **Main content grid (3 columns on lg)**  
   - Left/center (lg:col-span-2): Today’s Priorities (if tasks enabled).  
   - Order: priorities, deliverables, deadlines, quickLinks, overview (only visible blocks).  
   - Bottom: Quick Action tiles (if any).

### 12.2 Widget grid order (“Your Modules”)

Widgets are returned by `getWidgetsForModules(enabledModules)` in **registry order** (order of module IDs in `enabledModules`, then per-module widget array order).

**Preferred semantic order** (for when `widgetOrder` is implemented):

1. **Time & availability** – Time off summary (`time-off`).
2. **Client work** – Client overview, Deliverables due (`my-clients`).
3. **Content / reporting** – Instagram Analytics / recent reports (`instagram-reports`).
4. **Tasks** – Tasks summary (`tasks`).

So: time-off first, then my-clients, then instagram-reports, then tasks. Within a module, keep the order defined in `registry.js` (e.g. `clientOverview` before `deliverablesDue`).

**Rule:** High-frequency “what do I do today?” content (time off, my clients, tasks) ranks above less frequent or reference content (e.g. recent reports).

### 12.3 Quick Stats card order

- When both client and task access: **Total Clients** or **My Clients** (by access) → Pending Tasks → Due Today → Completed.
- Client metric only when `hasClientAccess`; task metrics only when `hasTasksModule`.
- Grid: 2 columns on small screens; 4 columns on `md+` when 3+ stats.

### 12.4 Main content column priority

- **Column 1–2 (wide):** Today’s Priorities (tasks) has highest priority when tasks enabled.
- **Column 3 (narrow):** Monthly Deliverables above Upcoming Deadlines above Quick Links, so “who/what needs me” is above generic links.

### 12.5 Overview card

- Stays at bottom of main content (end of scroll). Contains client and/or task summary; CTA “View Clients” or “View Tasks” by access.

---

## 13. Future improvements (suggestions)

1. **Widgets for more modules**  
   Add optional widgets for `client-packages`, `content-calendar`, `crm`, `team`, `hr-analytics` (e.g. “Recent activity” or “Quick stats”) so “Your Modules” is fuller when only those are enabled.

2. **Hide Quick Links card when empty**  
   If no Quick Link is shown (no tasks, team, resources, clients), hide the Quick Links card or show a short “Enable modules to see quick links” message.

3. **Order and grouping of widgets**  
   In the registry, add optional `widgetOrder` or `widgetGroup` so “Your Modules” follows the semantic order in section 12.2 (Time off first, then Clients, then Instagram, then Tasks).

4. **Single source for “client” link**  
   Helper e.g. `getClientListPath(enabledModules)` used everywhere (Monthly Deliverables, Overview, Quick Links) so the choice of `/clients` vs `/my-clients` is in one place.

5. **Permission IDs vs module IDs**  
   Firestore stores page IDs (e.g. `clients`). The registry uses module IDs (e.g. `my-clients`). Layout’s `allPages` includes both. Keep a single mapping (e.g. in registry or a small constants file) from page ID → module ID where they differ, so dashboard and nav stay aligned.

---

## File reference

| File | Role |
|------|------|
| `src/modules/registry.js` | Module definitions, `widgets`, `navItem`, `getWidgetsForModules`, `getNavItemsForModules`, `getBaseModuleIds` |
| `src/components/dashboard/WidgetGrid.jsx` | Renders “Your Modules” from `enabledModules` and lazy-loads widget components |
| `src/v3-app/components/Dashboard.jsx` | Builds `enabledModules`, `hasTasksModule`, `hasClientAccess`, `hasFullClientAccess`, `hasOnlyMyClients`; applies all display rules above |
| `src/v3-app/components/Layout.jsx` | Sidebar nav from same base + permissions logic |
| `src/contexts/PermissionsContext.js` | Provides `permissions` (page IDs) and `isSystemAdmin` |
