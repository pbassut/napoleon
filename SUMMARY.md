# Napoleon UI Components Summary

## What is this repository?

This repository contains the extracted UI component library for Napoleon, a macOS desktop application built with Tauri. Napoleon enables developers to run multiple Claude Code AI agents simultaneously in isolated git worktrees.

This is a **Tauri-compatible UI library** containing reusable React components, with all Next.js-specific code removed.

## What's Included

### UI Components (components/ui/)
A comprehensive library of 50+ accessible, customizable components:
- **Layout**: Sidebar, Resizable panels, Scroll areas, Separator
- **Navigation**: Tabs, Breadcrumb, Navigation menu, Menubar
- **Data Display**: Table, Card, Badge, Avatar, Skeleton, Empty states
- **Feedback**: Alert, Alert Dialog, Toast, Spinner, Progress
- **Forms**: Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Calendar, Date picker
- **Overlays**: Dialog, Sheet, Drawer, Popover, Tooltip, Hover card, Dropdown menu, Context menu
- **Interactive**: Button, Button group, Carousel, Accordion, Collapsible, Toggle, Command palette
- **Advanced**: Charts (Recharts), Terminal (Xterm), Field validation
- **Specialized**: Item component, KBD, Input OTP, Input groups

### Hooks (hooks/)
Custom React hooks for common patterns:
- `use-toast` - Toast notification management
- `use-mobile` - Responsive breakpoint detection

### Utilities (lib/)
Helper functions:
- `utils.ts` - Tailwind class merging with `clsx` and `tailwind-merge`

### Theming (components/)
- `theme-provider.tsx` - Dark/light mode support via `next-themes`

### Styles (styles/)
- `globals.css` - Base styles, CSS variables, Tailwind configuration

### Assets (public/)
- Placeholder images and logos for UI development

## Key Features

### 1. Accessibility First
Built on Radix UI primitives:
- WCAG 2.1 compliant components
- Full keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes throughout

### 2. Highly Customizable
Flexible theming and styling:
- CSS variables for easy theme customization
- Dark/light mode support built-in
- Tailwind CSS for utility-based styling
- Class variance authority for component variants
- Consistent design tokens

### 3. Production Ready
Enterprise-grade components:
- TypeScript strict mode throughout
- Comprehensive form validation with React Hook Form + Zod
- State management with Zustand
- Error boundaries and loading states
- Performance optimized

### 4. Developer Experience
Built for developers:
- Composable component architecture
- Minimal prop drilling with context
- Consistent API patterns
- TypeScript autocompletion
- Well-documented component interfaces

### 5. Tauri Compatible
Designed for desktop applications:
- No Next.js dependencies
- Pure client-side rendering
- Works with Tauri's WebView
- Compatible with Tauri IPC
- Optimized for desktop performance

## Component Categories

### Layout & Structure
- **Sidebar**: Collapsible navigation with nested menus
- **Resizable**: Draggable panel dividers
- **Scroll Area**: Custom scrollbars with Radix
- **Separator**: Divider lines

### Navigation
- **Tabs**: Horizontal/vertical tab navigation
- **Breadcrumb**: Hierarchical navigation
- **Navigation Menu**: Dropdown navigation with submenus
- **Menubar**: Application menu bar

### Forms & Inputs
- **Field**: Complete form field with label, description, error
- **Input**: Text input with variants
- **Textarea**: Multi-line text input
- **Select**: Dropdown selection
- **Checkbox**: Binary selection
- **Radio Group**: Multiple choice selection
- **Switch**: Toggle control
- **Slider**: Range input
- **Calendar**: Date selection with React Day Picker
- **Input OTP**: One-time password input
- **Input Group**: Grouped inputs with addons

### Overlays & Modals
- **Dialog**: Modal dialog
- **Sheet**: Slide-in panel from edges
- **Drawer**: Mobile-friendly bottom sheet (Vaul)
- **Popover**: Floating content
- **Tooltip**: Hover information
- **Hover Card**: Rich hover content
- **Dropdown Menu**: Action menus
- **Context Menu**: Right-click menus
- **Alert Dialog**: Confirmation dialogs

### Feedback & Status
- **Alert**: Inline notifications
- **Toast**: Temporary notifications (Sonner)
- **Spinner**: Loading indicator
- **Progress**: Progress bar
- **Skeleton**: Loading placeholders
- **Badge**: Status indicators
- **Empty**: Empty state component

### Data Display
- **Table**: Data tables with sorting/filtering
- **Card**: Content containers
- **Avatar**: User avatars with fallbacks
- **Accordion**: Collapsible sections
- **Collapsible**: Toggle content visibility

### Interactive
- **Button**: Primary action component with variants
- **Button Group**: Grouped buttons
- **Toggle**: Toggle buttons
- **Toggle Group**: Grouped toggles
- **Command**: Command palette (CMDK)
- **Carousel**: Image/content carousel (Embla)

### Specialized
- **Chart**: Data visualization (Recharts)
- **Item**: File/list item component
- **KBD**: Keyboard shortcut display
- **Pagination**: Page navigation

## Integration Guide

### For Tauri Applications

1. **Copy components to your Tauri project**
   ```
   src/
     components/
       ui/
     hooks/
     lib/
   ```

2. **Install dependencies**
   ```bash
   npm install react react-dom @radix-ui/react-* lucide-react tailwindcss
   ```

3. **Configure Tailwind CSS**
   - Copy `styles/globals.css` to your project
   - Set up Tailwind config with CSS variables
   - Import globals.css in your main entry point

4. **Wrap with theme provider**
   ```tsx
   import { ThemeProvider } from './components/theme-provider'

   function App() {
     return (
       <ThemeProvider defaultTheme="dark">
         {/* Your app */}
       </ThemeProvider>
     )
   }
   ```

5. **Import and use components**
   ```tsx
   import { Button } from './components/ui/button'
   import { Dialog } from './components/ui/dialog'
   ```

## Technical Highlights

### Type Safety
```typescript
// All components have strict TypeScript interfaces
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}
```

### Composability
```tsx
// Components compose naturally
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Form Validation
```tsx
// Integrated form validation with Zod
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

<Form {...form}>
  <Field name="email" label="Email" />
  <Field name="password" label="Password" type="password" />
</Form>
```

## Who Should Use This Library?

### Ideal For
- **Tauri developers** building desktop applications
- **Teams** needing a consistent component library
- **Projects** requiring accessible, production-ready components
- **Developers** who want shadcn/ui without Next.js
- **Applications** needing dark mode support

### When to Use
- Building a Tauri desktop application
- Need accessible, WCAG-compliant components
- Want Radix UI with pre-styled components
- Require form validation and state management
- Building complex UIs with modals, dropdowns, etc.

### When You Might Not Need It
- Building a simple web page
- Using a different component framework (MUI, Chakra, etc.)
- Already have an established component library
- Need framework-specific features (Next.js routing, etc.)

## Dependencies Overview

### Core (Required)
- React 19 + React DOM
- TypeScript 5
- Tailwind CSS 4.1.9

### UI Primitives (Required)
- @radix-ui/react-* (20+ packages)
- lucide-react (icons)

### State & Forms
- zustand (state management)
- react-hook-form + zod (form validation)

### Specialized Components
- xterm (terminal emulator)
- recharts (charts/graphs)
- framer-motion (animations)
- sonner (toasts)
- vaul (drawer)
- embla-carousel-react (carousel)

### Utilities
- class-variance-authority (component variants)
- tailwind-merge + clsx (class merging)
- date-fns (date formatting)
- next-themes (theme switching)

## What's NOT Included

This library excludes:
- ❌ Next.js app router or pages
- ❌ Server-side rendering
- ❌ API routes
- ❌ Build configuration (Vite, Webpack, etc.)
- ❌ Tauri backend code
- ❌ Application-specific business logic

This is a **pure UI component library** ready for integration.

## File Structure

```
napoleon-ui/
├── components/
│   ├── ui/              # 50+ UI components
│   └── theme-provider.tsx
├── hooks/
│   ├── use-toast.ts
│   └── use-mobile.ts
├── lib/
│   └── utils.ts
├── styles/
│   └── globals.css
├── public/              # Assets
├── components.json      # shadcn/ui config
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies
```

## License & Attribution

This component library is extracted from the Napoleon project for use in Tauri applications. Components are based on:
- [shadcn/ui](https://ui.shadcn.com/) - Component designs and patterns
- [Radix UI](https://www.radix-ui.com/) - Accessible primitives
- [Tailwind CSS](https://tailwindcss.com/) - Styling system

## Related Projects

- **Napoleon** - The main Tauri desktop application using these components
- **Conductor** - Alternative name/branding for Napoleon
- Built by [Melty Labs](https://meltylabs.com)

---

**Napoleon UI Components** - Production-ready React components for Tauri desktop applications.
