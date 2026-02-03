# Setup Guide: Canva Integration

Complete setup instructions for the Canva template sync and render system.

## Prerequisites

- Node.js 20+
- Firebase CLI installed and logged in
- Canva for Teams account
- Access to the Luxury Listings Firebase project

## Step 1: Canva App Setup

### 1.1 The app has already been created

The Canva app "LL Template Sync" was created via CLI at:
```
canva-integration/ll-template-sync/
```

### 1.2 Start the development server

```bash
cd canva-integration/ll-template-sync
npm start
```

This starts the local dev server at `http://localhost:8080`.

### 1.3 Preview in Canva

1. Go to the [Canva Developer Portal](https://www.canva.com/developers/app/AAHAALitzSA)
2. Navigate to **Code upload**
3. Select **App source > Development URL**
4. Enter: `http://localhost:8080`
5. Click **Preview**
6. Open a design and find the app in the Apps panel

### 1.4 Test the app

1. Open any Canva design
2. Add some text with placeholders: `{{address}}`, `{{price}}`
3. Open the LL Template Sync app
4. Fill in client name and template name
5. Click "Preview Elements" to test extraction
6. Click "Sync Template" (will fail until Cloud Function is deployed)

## Step 2: Deploy Cloud Functions

### 2.1 Add syncCanvaTemplate to functions/index.js

Copy the function from `cloud-functions/syncCanvaTemplate.js` to your main functions file:

```javascript
// In functions/index.js, add at the top:
const admin = require('firebase-admin');
const db = admin.firestore();

// Add this export:
exports.syncCanvaTemplate = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      client_name,
      template_name,
      template_type,
      canva_design_id,
      elements,
      placeholders,
      synced_at,
    } = req.body;

    if (!client_name || !template_name || !template_type) {
      res.status(400).json({
        error: 'Missing required fields',
      });
      return;
    }

    console.log(`📥 Syncing template: ${template_name} for ${client_name}`);

    // Look up client
    let client_id = null;
    const clientsSnapshot = await db.collection('clients')
      .where('clientName', '==', client_name)
      .limit(1)
      .get();

    if (!clientsSnapshot.empty) {
      client_id = clientsSnapshot.docs[0].id;
    }

    // Dimensions by type
    const dimensionMap = {
      'instagram_feed': { width: 1080, height: 1080 },
      'instagram_story': { width: 1080, height: 1920 },
      'facebook_post': { width: 1200, height: 630 },
    };

    const templateData = {
      client_id,
      client_name,
      template_name,
      template_type,
      canva_design_id,
      dimensions: dimensionMap[template_type] || { width: 1080, height: 1080 },
      elements: elements || [],
      placeholders: placeholders || [],
      version: 1,
      is_active: true,
      synced_at: admin.firestore.Timestamp.fromDate(new Date(synced_at)),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check for existing template
    const existingQuery = await db.collection('client_templates')
      .where('client_name', '==', client_name)
      .where('template_type', '==', template_type)
      .limit(1)
      .get();

    let templateId;
    if (!existingQuery.empty) {
      templateId = existingQuery.docs[0].id;
      const existing = existingQuery.docs[0].data();
      await db.collection('client_templates').doc(templateId).update({
        ...templateData,
        version: (existing.version || 0) + 1,
        created_at: existing.created_at,
      });
    } else {
      const docRef = await db.collection('client_templates').add(templateData);
      templateId = docRef.id;
    }

    res.json({
      success: true,
      template_id: templateId,
      client_id,
      message: `Template synced successfully`,
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2.2 Add Firestore Rules

Add to `firestore.rules`:

```javascript
// Client templates - authenticated users can read, admins can write
match /client_templates/{templateId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Generated designs - authenticated users can read/write their own
match /generated_designs/{designId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update, delete: if isAuthenticated() && 
    resource.data.created_by == request.auth.token.email;
}
```

### 2.3 Deploy

```bash
cd /Users/joshua/smmluxurylistings
firebase deploy --only functions:syncCanvaTemplate
firebase deploy --only firestore:rules
```

### 2.4 Update Canva App Endpoint

After deployment, get your function URL:
```
https://us-central1-luxury-listings-portal-e56de.cloudfunctions.net/syncCanvaTemplate
```

Update in `ll-template-sync/src/intents/design_editor/app.tsx`:
```typescript
const SYNC_ENDPOINT = "https://us-central1-luxury-listings-portal-e56de.cloudfunctions.net/syncCanvaTemplate";
```

## Step 3: Render Engine Setup (Optional)

The render engine uses Puppeteer to convert templates to images.

### 3.1 Install Puppeteer in Functions

```bash
cd functions
npm install puppeteer
```

### 3.2 Configure Firebase Functions

Puppeteer requires more memory. Update `firebase.json`:

```json
{
  "functions": {
    "runtime": "nodejs20",
    "memory": "1GB",
    "timeoutSeconds": 120
  }
}
```

### 3.3 Alternative: Use Cloud Run

For better Puppeteer performance, consider deploying the render function to Cloud Run instead of Firebase Functions.

## Step 4: Testing

### 4.1 Test Template Sync

1. Open Canva design with placeholders
2. Open LL Template Sync app
3. Fill form and click Sync
4. Check Firestore `client_templates` collection

### 4.2 Test Render (once deployed)

```javascript
// From browser console or frontend code:
const renderResult = await firebase.functions()
  .httpsCallable('renderTemplate')({
    template_id: 'YOUR_TEMPLATE_ID',
    property_data: {
      address: '123 Luxury Lane',
      price: '$4,500,000',
      beds: '5',
      baths: '4',
      sqft: '6,500',
      heroImage: 'https://example.com/photo.jpg',
      logoUrl: 'https://example.com/logo.png',
    },
  });

console.log(renderResult.data.image_url);
```

## Troubleshooting

### Canva App Won't Load
- Ensure dev server is running (`npm start`)
- Check browser console for errors
- Try Chrome (best supported)

### Sync Fails with CORS Error
- Ensure Cloud Function has `cors: true`
- Check function logs: `firebase functions:log`

### Template Not Found
- Verify `client_templates` collection exists in Firestore
- Check the `template_id` is correct

### Render Timeout
- Increase function timeout in firebase.json
- Reduce image complexity
- Consider Cloud Run for heavy workloads

## Next Steps

1. ✅ Deploy syncCanvaTemplate function
2. ⬜ Add UI in main app to browse synced templates
3. ⬜ Implement listing URL parser
4. ⬜ Build render engine with Puppeteer
5. ⬜ Add template to Content Calendar integration
