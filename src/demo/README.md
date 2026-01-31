# 1Code-Inspired Demo - Apple-like Design

A complete redesign using modern Apple-like aesthetics and design patterns from [21st.dev](https://21st.dev).

## Features

### UI Components (inspired by 21st.dev)

| Component | Description | 21st.dev Inspiration |
|-----------|-------------|----------------------|
| `GlassCard` | Glassmorphism card with blur effects | Cards (79 components) |
| `GradientText` | Animated gradient text | Texts (58 components) |
| `ModernButton` | Multiple button variants with glow | Buttons (130 components) |
| `FloatingDock` | macOS-style dock navigation | Docks (6 components) |
| `ShaderBackground` | Animated mesh/grid backgrounds | Shaders (15 components) |
| `FeatureCard` | Feature showcase cards | Features (36 components) |
| `CodeBlock` | Apple-style code display | UI Components |
| `Badge` | Status badges with variants | Badges (25 components) |
| `Tooltip` | Hover tooltips | Tooltips (28 components) |
| `Sidebar` | Apple-style sidebar nav | Sidebars (10 components) |

### Feature Pages

1. **Diff Preview** - Visual code comparison with split/unified views
2. **Plan Mode** - AI-powered structured planning with clarifying questions
3. **Change Tracker** - Git-like change tracking with staging/commit
4. **Code Editor** - Modern code editor with syntax highlighting

## Design System

### Color Palette

```css
/* Gradients */
--gradient-primary: from-indigo-500 via-purple-500 to-pink-500
--gradient-blue: from-blue-500 to-cyan-500
--gradient-sunset: from-orange-500 to-pink-500
--gradient-success: from-green-500 to-teal-500

/* Backgrounds */
--bg-glass: rgba(255, 255, 255, 0.7) / rgba(24, 24, 27, 0.7)
--bg-mesh: Animated blob gradients
```

### Typography

- **Display**: Bold, gradient text for headings
- **Body**: Clean, readable zinc colors
- **Code**: SF Mono, Menlo, monospace

### Effects

- **Glassmorphism**: `backdrop-blur-xl backdrop-saturate-150`
- **Shadows**: Soft, diffused shadows with color tints
- **Animations**: Smooth transitions, blob animations, fade-ins

## Component Usage

### GlassCard

```jsx
import { GlassCard } from './components/ui';

<GlassCard hover glow padding="p-6">
  Your content here
</GlassCard>
```

### ModernButton

```jsx
import { ModernButton } from './components/ui';

<ModernButton variant="gradient" size="lg" glow>
  Click Me
</ModernButton>

// Variants: default, gradient, ghost, glass, outline, danger
// Sizes: sm, default, lg, xl
```

### GradientText

```jsx
import { GradientText } from './components/ui';

<GradientText variant="purple" as="h1">
  Beautiful Heading
</GradientText>

// Variants: default, purple, blue, sunset, ocean, aurora
```

### FloatingDock

```jsx
import { FloatingDock } from './components/ui';

<FloatingDock 
  activeTab={activeTab} 
  onTabChange={setActiveTab} 
/>
```

### ShaderBackground

```jsx
import { ShaderBackground } from './components/ui';

<ShaderBackground variant="mesh" />

// Variants: mesh, grid, radial
```

## File Structure

```
src/demo/
├── DemoPage.jsx           # Main demo page
├── styles.css             # Custom animations
├── README.md              # Documentation
└── components/
    ├── DiffPreview.jsx    # Code diff visualization
    ├── PlanMode.jsx       # Planning interface
    ├── ChangeTracker.jsx  # Git-like changes
    ├── CodeEditor.jsx     # Code editor
    └── ui/
        ├── index.js       # Exports
        ├── GlassCard.jsx
        ├── GradientText.jsx
        ├── ModernButton.jsx
        ├── FloatingDock.jsx
        ├── Sidebar.jsx
        ├── ShaderBackground.jsx
        ├── FeatureCard.jsx
        ├── CodeBlock.jsx
        ├── Badge.jsx
        └── Tooltip.jsx
```

## Access

Navigate to `/demo` in your application to see the interactive showcase.

## Credits

- Design inspiration: [21st.dev](https://21st.dev) - Community-made UI components
- Code patterns: [1Code by 21st.dev](https://github.com/21st-dev/1Code) - Claude Code GUI
- Icons: [Lucide React](https://lucide.dev)
- Styling: [Tailwind CSS](https://tailwindcss.com)

## Key Design Principles

1. **Glassmorphism** - Translucent backgrounds with blur
2. **Gradient Accents** - Colorful gradients for visual interest
3. **Soft Shadows** - Diffused, colored shadows
4. **Smooth Animations** - Subtle, purposeful motion
5. **Clean Typography** - Clear hierarchy and spacing
6. **Dark Mode Support** - Full dark theme compatibility
