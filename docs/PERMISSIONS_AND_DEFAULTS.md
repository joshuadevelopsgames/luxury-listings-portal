# Permissions and job-critical access

## What can obstruct users

1. **Page permissions** – If a user doesn’t have a **page** in their `pagePermissions`, they can’t open that route (PermissionRoute blocks them) and won’t see it in nav. Base modules (time-off, my-clients, instagram-reports) are in the default set for new users but can be revoked per user.

2. **Feature permissions** – Within a page, actions can be gated by **feature** permissions (e.g. `manage_clients`, `approve_time_off`). If a user has the "clients" page but not `MANAGE_CLIENTS`, they can open Clients but can’t add/edit/remove clients. New users previously had **no** feature permissions by default, so they were blocked from those actions until an admin toggled them.

3. **Role vs permissions** – Role (e.g. social_media_manager) was only used for display. Default permissions were the same for every new user, so SMMs didn’t get the clients page or manage-clients feature by default.

## Defaults when adding a user

- **Role is ignored for permissions.** The role field is for display/organization only; it does not affect which pages or features a user gets.
- **Pages**: New users get dashboard, tasks, resources, features, tutorials, and base modules (time-off, my-clients, instagram-reports) only. **Clients** and all other pages (e.g. team, hr-calendar, crm) are **hidden by default**; enable them per user in Users & Permissions.
- **Features**: New users get no feature permissions by default (empty list). Grant `manage_clients`, `approve_time_off`, etc. per user as needed.

Admins enable pages and features per user in the Permissions Manager.

## Always-accessible

- **Dashboard** – Always allowed (PermissionsContext).
- **My Time Off** (`/my-time-off`) – Route is not behind PermissionRoute; anyone logged in can open it. Nav link still depends on having the `time-off` page.
- **Instagram Reports** (`/instagram-reports`) – Same: route is open; nav depends on `instagram-reports` page.
- **Permissions** (`/permissions`) – Route is open but the page itself shows “Access Denied” unless the user is a system admin.

## Running the system check

```bash
node scripts/check-permissions-modules.js
```

This checks that registry modules, PermissionsManager ALL_PAGES, App routes, and feature mappings stay in sync.
