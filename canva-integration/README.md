# Canva Integration for SMM Luxury Listings

Automated design generation pipeline that syncs Canva templates and renders social media posts with dynamic property data.

## Overview

This integration enables:
1. **Template Sync**: Export Canva design structures to our system via a private Canva App
2. **Auto-Generation**: Render social posts by filling templates with listing data
3. **Asset Pipeline**: Listing URL → Property Data → Design → Ready-to-post image

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  DESIGNER IN CANVA                                              │
│  1. Creates/updates template design                             │
│  2. Marks dynamic fields with placeholders: {{address}}         │
│  3. Clicks "Sync to Luxury Listings" button (our app)           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  CANVA APP (canva-app/)                                         │
│  - Reads all design elements via Canva SDK                      │
│  - Identifies placeholder text ({{field}})                      │
│  - POSTs structure to our Cloud Function                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLOUD FUNCTIONS (functions/)                                   │
│  - syncTemplate: Stores template structure in Firestore         │
│  - renderTemplate: Generates final image with property data     │
│  - parseListingURL: Extracts property data from listing links   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT                                                         │
│  - Ready-to-post PNG/JPG                                        │
│  - Attached to Content Calendar                                 │
│  - Linked to Graphic Project                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
canva-integration/
├── README.md                    # This file
├── canva-app/                   # Canva App (created via CLI)
│   ├── src/
│   │   └── app.tsx              # Main app with sync functionality
│   └── ...
├── cloud-functions/             # Additional Cloud Functions
│   ├── syncTemplate.js          # Receive template data from Canva App
│   ├── renderTemplate.js        # Generate images from templates
│   └── parseListingURL.js       # Extract property data from URLs
└── docs/
    ├── ARCHITECTURE.md          # Detailed system design
    ├── TEMPLATE_SCHEMA.md       # Data model for templates
    └── SETUP.md                 # Development setup guide
```

## Quick Start

### Prerequisites
- Node.js 18+
- Canva for Teams account (for private app distribution)
- Access to Firebase project (luxury-listings-portal-e56de)

### Setup

1. **Install Canva CLI**
   ```bash
   npm install -g @canva/cli@latest
   ```

2. **Login to Canva**
   ```bash
   canva login
   ```

3. **The app has been created in `canva-app/` folder**

4. **Run development server**
   ```bash
   cd canva-integration/canva-app
   npm start
   ```

5. **Preview in Canva**
   - Go to Canva Developer Portal
   - Set Development URL to `http://localhost:8080`
   - Click Preview

## Placeholder Syntax

Templates use `{{fieldName}}` syntax for dynamic content:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{address}}` | Property address | 123 Luxury Lane |
| `{{price}}` | Listing price | $4,500,000 |
| `{{beds}}` | Bedroom count | 5 |
| `{{baths}}` | Bathroom count | 4 |
| `{{sqft}}` | Square footage | 6,500 |
| `{{heroImage}}` | Main property photo URL | https://... |
| `{{logoUrl}}` | Client logo URL | https://... |

## Data Flow

1. **Listing URL Input** → Manager pastes MLS/Zillow link
2. **Parse Property** → GPT-4V extracts structured data
3. **Match Client** → Find client by agent/brokerage name
4. **Select Template** → Get client's synced Canva template
5. **Render Design** → Fill placeholders, generate PNG
6. **Deliver** → Attach to Content Calendar or download

## Related Files

- `src/services/firestoreService.js` - Template storage
- `functions/index.js` - Existing Cloud Functions
- `src/pages/GraphicProjectTracker.jsx` - Design project management

## Status

🚧 **In Development**

- [x] Project structure created
- [ ] Canva App scaffold
- [ ] Template sync endpoint
- [ ] Render engine
- [ ] UI integration
