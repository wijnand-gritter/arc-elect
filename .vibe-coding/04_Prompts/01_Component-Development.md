# Component Development Template

## 🎯 **Template Purpose**

Create a new React component for the Arc Elect JSON Schema Editor following established patterns, TypeScript best practices, and project-specific conventions.

## 📋 **Template Usage**

Replace the placeholders below with your specific requirements:

- `[COMPONENT_NAME]` - The name of your component (PascalCase)
- `[FEATURE_DESCRIPTION]` - Brief description of what the component does
- `[SPECIFIC_REQUIREMENTS]` - Any specific requirements, props, or behavior

## 🚀 **Prompt Template**

```
I need to create a new React component for the Arc Elect JSON Schema Editor project.

**Component Details:**
- Component Name: [COMPONENT_NAME]
- Feature Description: [FEATURE_DESCRIPTION]
- Specific Requirements: [SPECIFIC_REQUIREMENTS]

**Project Context:**
- Tech Stack: Electron 37.2.3, React 19.1.0, TypeScript 5.8.3, shadcn/ui, Tailwind CSS
- State Management: Zustand for global state, React Query for server state
- File Structure: src/renderer/components/ for shared components
- Patterns: Follow DEV_GUIDELINES.md and established component patterns

**Requirements:**
1. Create a TypeScript React component with proper interfaces
2. Follow shadcn/ui component patterns and styling
3. Implement proper error handling using safeHandler pattern
4. Add accessibility features (ARIA labels, keyboard navigation)
5. Include proper loading states and error boundaries
6. Use the project's theme system (light/dark mode support)
7. Implement proper logging using renderer-logger
8. Add toast notifications for user feedback using Sonner
9. Follow the project's file naming and structure conventions
10. Include proper TypeScript types and interfaces

**Additional Context:**
- This component will be used in the [MODULE_NAME] module
- It should integrate with the existing state management system
- Performance is important for large schema collections
- The component should be reusable and maintainable

Please provide:
1. Complete component implementation with TypeScript interfaces
2. Proper error handling and loading states
3. Accessibility implementation
4. Integration with the project's state management
5. Testing considerations and examples
```

## 🎨 **Component Structure Pattern**

### **File Organization**

```
src/renderer/components/
├── [ComponentName]/
│   ├── [ComponentName].tsx          # Main component
│   ├── [ComponentName].types.ts     # TypeScript interfaces
│   ├── [ComponentName].test.tsx     # Unit tests
│   └── index.ts                     # Barrel export
```

### **Component Template Structure**

```typescript
// [ComponentName].types.ts
export interface [ComponentName]Props {
  // Define your props here
}

export interface [ComponentName]State {
  // Define component state if needed
}

// [ComponentName].tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { safeHandler } from '@/lib/error-handling';
import { toast } from 'sonner';
import logger from '@/lib/renderer-logger';
import { useAppStore } from '@/stores/useAppStore';

export const [ComponentName]: React.FC<[ComponentName]Props> = ({
  // Destructure props
}) => {
  // Component implementation
};
```

## 🔧 **Implementation Guidelines**

### **TypeScript Best Practices**

- Use strict TypeScript configuration
- Define proper interfaces for all props and state
- Use generic types when appropriate
- Implement proper type guards for runtime validation

### **React Patterns**

- Use functional components with hooks
- Implement proper dependency arrays in useEffect
- Use React.memo for performance optimization when needed
- Follow the established error boundary patterns

### **Styling Guidelines**

- Use Tailwind CSS utility classes
- Follow shadcn/ui component patterns
- Support light/dark theme modes
- Use CSS variables for custom styling

### **Error Handling**

- Use safeHandler for event handlers
- Implement proper error boundaries
- Log errors using renderer-logger
- Show user-friendly error messages with Sonner

### **Accessibility**

- Add proper ARIA labels and roles
- Implement keyboard navigation
- Ensure proper focus management
- Test with screen readers

### **Performance Considerations**

- Use React.memo for expensive components
- Implement proper loading states
- Use lazy loading for large datasets
- Optimize re-renders with useCallback/useMemo

## 📝 **Example Implementation**

### **SchemaCard Component Example**

```typescript
// SchemaCard.types.ts
export interface SchemaCardProps {
  schema: Schema;
  onSelect?: (schema: Schema) => void;
  onEdit?: (schema: Schema) => void;
  className?: string;
}

// SchemaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { safeHandler } from '@/lib/error-handling';
import { toast } from 'sonner';
import logger from '@/lib/renderer-logger';
import { useAppStore } from '@/stores/useAppStore';

export const SchemaCard: React.FC<SchemaCardProps> = ({
  schema,
  onSelect,
  onEdit,
  className,
}) => {
  const handleSelect = safeHandler(() => {
    logger.info('Schema selected', { schemaId: schema.id });
    onSelect?.(schema);
  });

  const handleEdit = safeHandler(() => {
    logger.info('Schema edit requested', { schemaId: schema.id });
    onEdit?.(schema);
  });

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{schema.metadata.title || schema.name}</span>
          <Badge variant={schema.validationStatus === 'valid' ? 'default' : 'destructive'}>
            {schema.validationStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {schema.metadata.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {schema.references.length} references
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelect}>
              View
            </Button>
            <Button size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

## 🧪 **Testing Guidelines**

### **Test Structure**

```typescript
// [ComponentName].test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { [ComponentName] } from './[ComponentName]';

describe('[ComponentName]', () => {
  it('renders correctly', () => {
    // Test implementation
  });

  it('handles user interactions', () => {
    // Test implementation
  });

  it('displays error states properly', () => {
    // Test implementation
  });
});
```

### **Testing Best Practices**

- Test component behavior, not implementation details
- Mock external dependencies appropriately
- Test accessibility features
- Test error handling and edge cases

## 📚 **Additional Resources**

### **Project Documentation**

- `DEV_GUIDELINES.md` - Core development guidelines
- `src/renderer/components/` - Existing component examples
- `src/renderer/stores/useAppStore.ts` - State management patterns

### **External Resources**

- [React Component Best Practices](https://react.dev/learn)
- [shadcn/ui Component Library](https://ui.shadcn.com/)
- [TypeScript React Patterns](https://www.typescriptlang.org/docs/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

This template ensures your components follow the project's established patterns and maintain consistency with the existing codebase.
