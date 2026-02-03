# Architecture: Canva Integration

## System Components

### 1. Canva App (Private)

**Purpose**: Extract design structure from Canva templates

**Tech Stack**:
- React + TypeScript
- Canva Apps SDK
- @canva/design-interaction for reading elements

**Key Functions**:
- Read all elements in current design
- Identify placeholder text patterns (`{{fieldName}}`)
- POST structure to our sync endpoint
- Display sync status to designer

### 2. Cloud Functions

#### `syncTemplate`
- **Trigger**: HTTP POST from Canva App
- **Input**: Design structure JSON
- **Output**: Stored template in Firestore
- **Auth**: Verify request comes from our Canva App

#### `renderTemplate`
- **Trigger**: HTTP callable from frontend
- **Input**: Template ID + property data
- **Output**: PNG image URL (stored in Firebase Storage)
- **Engine**: Puppeteer (HTML/CSS) or node-canvas

#### `parseListingURL`
- **Trigger**: HTTP callable from frontend
- **Input**: MLS/Zillow/Realtor URL
- **Output**: Structured property data
- **Method**: Screenshot + GPT-4V extraction

### 3. Firestore Collections

#### `client_templates`
```javascript
{
  id: "auto-generated",
  client_id: "abc123",
  client_name: "Luxury Realty Group",
  template_type: "instagram_feed", // instagram_story, facebook_post, etc.
  canva_design_id: "DAFxyz789",
  dimensions: { width: 1080, height: 1080 },
  elements: [
    {
      type: "IMAGE",
      id: "hero",
      position: { x: 0, y: 0 },
      size: { width: 1080, height: 756 },
      placeholder: "heroImage", // null if static
      static_src: null // URL if static image
    },
    {
      type: "TEXT",
      id: "address",
      position: { x: 40, y: 780 },
      font: { family: "Playfair Display", size: 42, weight: "bold" },
      color: "#FFFFFF",
      placeholder: "address",
      static_content: null
    },
    // ... more elements
  ],
  placeholders: ["heroImage", "address", "price", "beds", "baths", "sqft"],
  version: 1,
  synced_at: Timestamp,
  synced_by: "designer@agency.com"
}
```

#### `generated_designs`
```javascript
{
  id: "auto-generated",
  template_id: "tpl_abc123",
  client_id: "client_xyz",
  property_data: {
    address: "123 Luxury Lane",
    price: "$4,500,000",
    // ...
  },
  output_url: "https://storage.../generated/design_123.png",
  created_at: Timestamp,
  created_by: "manager@agency.com",
  attached_to: {
    type: "content_calendar",
    id: "cal_item_456"
  }
}
```

## Render Engine Options

### Option A: HTML/CSS + Puppeteer (Recommended)

**Pros**:
- Familiar tech (CSS positioning, fonts, etc.)
- Easy to debug (view in browser)
- Good text rendering with web fonts

**Cons**:
- Puppeteer requires headless Chrome (heavier)
- Some Canva effects hard to replicate

**Flow**:
1. Load template from Firestore
2. Generate HTML string with elements positioned via CSS
3. Inject property data into placeholders
4. Render with Puppeteer, screenshot to PNG
5. Upload to Firebase Storage

### Option B: node-canvas (Lighter)

**Pros**:
- No browser dependency
- Faster for simple templates
- Lower memory footprint

**Cons**:
- Text positioning more manual
- Font loading requires setup
- Complex layouts harder

## Security

### Canva App → Cloud Function
- Canva App includes a signed token in requests
- Cloud Function validates token before processing
- Tokens tied to our Canva Developer account

### Cloud Function → Firestore
- Uses Firebase Admin SDK
- Service account with appropriate permissions

### Frontend → Cloud Function
- Firebase Auth required
- User must have appropriate role/permission

## Error Handling

| Scenario | Handling |
|----------|----------|
| Canva sync fails | Show error in app, retry button |
| Template not found | Return 404, suggest re-sync |
| Render timeout | Queue for retry, notify admin |
| Invalid property data | Return validation errors |
| Storage upload fails | Retry with exponential backoff |

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Template sync | < 2s | Small JSON payload |
| Listing URL parse | < 10s | Depends on GPT-4V |
| Design render | < 5s | Puppeteer cold start ~2s |
| Full pipeline | < 20s | End-to-end automation |
