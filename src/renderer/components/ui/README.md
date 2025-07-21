# UI Components

This directory contains all custom and shared UI components for the renderer, including those generated with shadcn/ui.

## How to add a new UI component

1. Use the shadcn/ui CLI to generate a component:
   ```sh
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add select
   # ...etc.
   ```
   This will place the component in this directory.
2. You can also add your own custom components here. Use the same structure and naming conventions as shadcn/ui for consistency.
3. Import and use components in your pages or other components:
   ```tsx
   import { Button } from '@//components/ui/button';
   <Button>Click me</Button>;
   ```

## Styling

- All components use Tailwind CSS for styling. Use utility classes and, where needed, extend with custom classes.
- For icons, use `lucide-react`:
  ```tsx
  import { Sun } from 'lucide-react';
  <Sun className="w-4 h-4" />;
  ```
- Use CSS variables (see `globals.css`) for colors, radius, etc. for consistent theming.

## Best practices

- Keep all shared and reusable UI components in this directory.
- Prefer composition and reuse over duplication.
- Use shadcn/ui as the base for new components when possible for consistency.
- Document any custom components with a file-level comment.

---

With this structure, your UI is consistent, maintainable, and easy to extend for all developers.
