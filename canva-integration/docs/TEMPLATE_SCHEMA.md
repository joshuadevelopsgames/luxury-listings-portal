# Template Schema

## Overview

Templates are stored in Firestore and represent the structure of a Canva design with dynamic placeholders.

## Firestore Collection: `client_templates`

### Document Structure

```typescript
interface ClientTemplate {
  // Identifiers
  id: string;                    // Firestore document ID
  client_id: string;             // Reference to clients collection
  client_name: string;           // Denormalized for display
  
  // Template metadata
  template_type: TemplateType;
  template_name: string;         // Human-readable name
  canva_design_id: string;       // Original Canva design ID
  
  // Dimensions
  dimensions: {
    width: number;               // pixels
    height: number;              // pixels
  };
  
  // Design elements
  elements: DesignElement[];
  
  // Placeholder summary
  placeholders: string[];        // List of all placeholder names
  
  // Versioning
  version: number;
  synced_at: Timestamp;
  synced_by: string;             // Email of designer who synced
  
  // Status
  is_active: boolean;
  preview_url?: string;          // Static preview image
}

type TemplateType = 
  | 'instagram_feed'
  | 'instagram_story'
  | 'instagram_reel_cover'
  | 'facebook_post'
  | 'facebook_cover'
  | 'linkedin_post'
  | 'twitter_post';
```

### Element Types

```typescript
type DesignElement = ImageElement | TextElement | ShapeElement;

interface BaseElement {
  id: string;
  type: 'IMAGE' | 'TEXT' | 'SHAPE';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;             // degrees
  opacity?: number;              // 0-1
  zIndex: number;
}

interface ImageElement extends BaseElement {
  type: 'IMAGE';
  placeholder?: string;          // e.g., "heroImage", "logoUrl"
  static_src?: string;           // URL if not dynamic
  fit: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
}

interface TextElement extends BaseElement {
  type: 'TEXT';
  placeholder?: string;          // e.g., "address", "price"
  static_content?: string;       // Text if not dynamic
  font: {
    family: string;
    size: number;
    weight: 'normal' | 'bold' | '100' | '200' | ... | '900';
    style: 'normal' | 'italic';
  };
  color: string;                 // hex color
  textAlign: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface ShapeElement extends BaseElement {
  type: 'SHAPE';
  shapeType: 'rectangle' | 'circle' | 'line';
  fill?: string;                 // hex color or gradient
  stroke?: {
    color: string;
    width: number;
  };
  borderRadius?: number;
}
```

## Standard Placeholders

| Placeholder | Type | Description | Example Value |
|-------------|------|-------------|---------------|
| `heroImage` | IMAGE | Main property photo | `https://...` |
| `logoUrl` | IMAGE | Client logo | `https://...` |
| `address` | TEXT | Property address | "123 Luxury Lane" |
| `price` | TEXT | Listing price | "$4,500,000" |
| `beds` | TEXT | Bedroom count | "5" |
| `baths` | TEXT | Bathroom count | "4" |
| `sqft` | TEXT | Square footage | "6,500" |
| `city` | TEXT | City name | "Beverly Hills" |
| `state` | TEXT | State abbreviation | "CA" |
| `agent_name` | TEXT | Listing agent | "John Smith" |
| `brokerage` | TEXT | Brokerage name | "Luxury Realty" |
| `features` | TEXT | Key features | "Pool • Ocean View" |

## Property Data Input

When rendering, property data is provided as:

```typescript
interface PropertyData {
  // Required
  address: string;
  price: string;                 // Already formatted with $ and commas
  
  // Common
  beds?: string;
  baths?: string;
  sqft?: string;
  
  // Images
  heroImage?: string;            // URL
  photos?: string[];             // Additional photo URLs
  
  // Location
  city?: string;
  state?: string;
  zip?: string;
  
  // Agent/Listing
  agent_name?: string;
  brokerage?: string;
  mls_number?: string;
  
  // Features
  features?: string[];           // Joined with separator
  lot_size?: string;
  year_built?: string;
  
  // Client branding (usually from client record)
  logoUrl?: string;
  brand_color?: string;
}
```

## Render Request

```typescript
interface RenderRequest {
  template_id: string;           // Firestore template document ID
  property_data: PropertyData;
  output_format: 'png' | 'jpg';
  output_quality?: number;       // 1-100 for JPG
}

interface RenderResponse {
  success: boolean;
  image_url?: string;            // Firebase Storage URL
  generated_design_id?: string;  // Firestore record ID
  error?: string;
}
```

## Example: Instagram Feed Template

```json
{
  "id": "tpl_lux_realty_ig_feed",
  "client_id": "client_abc123",
  "client_name": "Luxury Realty Group",
  "template_type": "instagram_feed",
  "template_name": "Property Showcase - Dark",
  "canva_design_id": "DAFxyz789",
  "dimensions": { "width": 1080, "height": 1080 },
  "elements": [
    {
      "id": "bg",
      "type": "SHAPE",
      "shapeType": "rectangle",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 1080, "height": 1080 },
      "fill": "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      "zIndex": 0
    },
    {
      "id": "hero",
      "type": "IMAGE",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 1080, "height": 756 },
      "placeholder": "heroImage",
      "fit": "cover",
      "zIndex": 1
    },
    {
      "id": "address_text",
      "type": "TEXT",
      "position": { "x": 40, "y": 780 },
      "size": { "width": 1000, "height": 50 },
      "placeholder": "address",
      "font": {
        "family": "Playfair Display",
        "size": 42,
        "weight": "bold",
        "style": "normal"
      },
      "color": "#FFFFFF",
      "textAlign": "left",
      "zIndex": 2
    },
    {
      "id": "price_text",
      "type": "TEXT",
      "position": { "x": 40, "y": 850 },
      "size": { "width": 500, "height": 60 },
      "placeholder": "price",
      "font": {
        "family": "Playfair Display",
        "size": 56,
        "weight": "bold",
        "style": "normal"
      },
      "color": "#E94560",
      "textAlign": "left",
      "zIndex": 2
    },
    {
      "id": "details_text",
      "type": "TEXT",
      "position": { "x": 40, "y": 930 },
      "size": { "width": 600, "height": 40 },
      "placeholder": null,
      "static_content": "{{beds}} BD | {{baths}} BA | {{sqft}} SF",
      "font": {
        "family": "Playfair Display",
        "size": 28,
        "weight": "normal",
        "style": "normal"
      },
      "color": "rgba(255,255,255,0.9)",
      "textAlign": "left",
      "zIndex": 2
    },
    {
      "id": "logo",
      "type": "IMAGE",
      "position": { "x": 980, "y": 1000 },
      "size": { "width": 60, "height": 60 },
      "placeholder": "logoUrl",
      "fit": "contain",
      "zIndex": 3
    }
  ],
  "placeholders": ["heroImage", "address", "price", "beds", "baths", "sqft", "logoUrl"],
  "version": 1,
  "is_active": true
}
```
