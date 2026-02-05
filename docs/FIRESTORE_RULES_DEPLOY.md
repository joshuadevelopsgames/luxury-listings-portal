# Firestore Rules & How to Deploy Them

## Your current rules

Your project’s rules live in **`firestore.rules`** at the repo root. Here they are (same content):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isAdmin() {
      return isAuthenticated() &&
             (request.auth.token.email == 'jrsschroeder@gmail.com' ||
              request.auth.token.email == 'demo@luxurylistings.app');
    }
    function getUserEmail() {
      return request.auth.token.email;
    }
    match /users/{userId} {
      allow read, write: if isAuthenticated() &&
                            (request.auth.uid == userId || isAdmin());
    }
    match /user_dashboard_preferences/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    match /pending_users/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /approved_users/{userEmail} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /employees/{employeeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /tasks/{taskId} {
      allow read, write: if isAuthenticated();
    }
    match /task_templates/{templateId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /smart_filters/{filterId} {
      allow read, write: if isAuthenticated();
    }
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /client_contracts/{contractId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /client_messages/{messageId} {
      allow read, write: if isAuthenticated();
    }
    match /client_reports/{reportId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /pending_clients/{clientId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /analytics_config/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /system_config/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /support_tickets/{ticketId} {
      allow read, write: if isAuthenticated();
    }
    match /ticket_comments/{commentId} {
      allow read, write: if isAuthenticated();
    }
    match /notifications/{notificationId} {
      allow read, write: if isAuthenticated();
    }
    match /task_requests/{requestId} {
      allow read, write: if isAuthenticated();
    }
    match /user_task_archives/{docId} {
      allow read: if isAuthenticated() && resource.data.userEmail == request.auth.token.email;
      allow create: if isAuthenticated() && request.resource.data.userEmail == request.auth.token.email;
      allow update, delete: if isAuthenticated() && resource.data.userEmail == request.auth.token.email;
    }
    match /leave_requests/{requestId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /graphic_projects/{projectId} {
      allow read, write: if isAuthenticated();
    }
    match /project_requests/{requestId} {
      allow read, write: if isAuthenticated();
    }
    match /feedback/{feedbackId} {
      allow read, write: if isAuthenticated();
    }
    match /feedback_chats/{chatId} {
      allow read, write: if isAuthenticated();
    }
    match /instagram_reports/{reportId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
        (resource.data.userId == request.auth.uid || isAdmin());
    }
    match /error_reports/{reportId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /client_templates/{templateId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /generated_designs/{designId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
        resource.data.created_by == request.auth.token.email;
    }
  }
}
```

---

## How to put them into Firebase

You can use either the **Firebase Console** (copy‑paste) or the **Firebase CLI** (deploy from your repo).

### Option A: Firebase Console (copy‑paste)

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project.
2. In the left sidebar go to **Build → Firestore Database**.
3. Open the **Rules** tab.
4. Replace everything in the editor with the rules above (or with the contents of your local `firestore.rules` file).
5. Click **Publish**.  
   Rules go live within a short time.

### Option B: Firebase CLI (deploy from repo)

1. **Use your project** (if you haven’t already):
   ```bash
   firebase use --add
   ```
   Pick the project (e.g. `luxury-listings-portal`).  
   Or use a specific project once:
   ```bash
   firebase use YOUR_PROJECT_ID
   ```

2. **Deploy only Firestore rules** (no hosting/functions):
   ```bash
   firebase deploy --only firestore:rules
   ```

3. When it finishes, the rules in the console will match your local `firestore.rules` file.

---

## After you deploy

- Changes apply within a few seconds.
- To confirm: Firebase Console → Firestore Database → **Rules** tab; you should see the same rules you deployed.
- If something breaks, fix the rules in `firestore.rules` and run `firebase deploy --only firestore:rules` again (or edit and Publish in the console).
