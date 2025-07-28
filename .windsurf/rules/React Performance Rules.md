---
trigger: always_on
description:
globs:
---

# React Performance Rules

## Component Optimization

### Memoization Strategy

- Use `React.memo()` for expensive components
- Use `useCallback()` for event handlers passed to children
- Use `useMemo()` for expensive calculations
- Avoid premature optimization

### Component Structure

```typescript
// ✅ Good: Memoized component with optimized props
const ExpensiveComponent = React.memo(({ data, onAction }: Props) => {
  const processedData = useMemo(() => processData(data), [data]);

  const handleClick = useCallback(() => {
    onAction(processedData);
  }, [onAction, processedData]);

  return <div onClick={handleClick}>{/* component content */}</div>;
});

// ❌ Bad: No optimization, re-renders unnecessarily
const ExpensiveComponent = ({ data, onAction }: Props) => {
  const processedData = processData(data); // Recalculated on every render

  return <div onClick={() => onAction(processedData)}>{/* content */}</div>;
};
```

### State Management

- Keep state as close to where it's used as possible
- Use local state for component-specific data
- Use context for shared state across components
- Use external state management for global state

## Hook Optimization

### useEffect Best Practices

- Always include proper dependency arrays
- Clean up side effects in return function
- Avoid infinite re-render loops
- Use multiple useEffect hooks for different concerns

```typescript
// ✅ Good: Proper useEffect with cleanup
useEffect(() => {
  const subscription = subscribeToData();

  return () => {
    subscription.unsubscribe();
  };
}, [dependencies]);

// ❌ Bad: Missing dependencies or cleanup
useEffect(() => {
  subscribeToData(); // No cleanup, potential memory leak
}, []); // Missing dependencies
```

### Custom Hook Optimization

- Extract reusable logic into custom hooks
- Use proper dependency arrays in custom hooks
- Return stable references when possible
- Document hook dependencies clearly

## Rendering Optimization

### List Rendering

- Use `key` prop for list items
- Use virtualization for large lists
- Avoid inline functions in map
- Use `React.memo()` for list items

```typescript
// ✅ Good: Optimized list rendering
const ListItem = React.memo(({ item, onSelect }: ListItemProps) => (
  <div onClick={() => onSelect(item.id)}>{item.name}</div>
));

const List = ({ items, onSelect }: ListProps) => (
  <div>
    {items.map(item => (
      <ListItem key={item.id} item={item} onSelect={onSelect} />
    ))}
  </div>
);

// ❌ Bad: Inline functions and no memoization
const List = ({ items, onSelect }: ListProps) => (
  <div>
    {items.map(item => (
      <div key={item.id} onClick={() => onSelect(item.id)}>
        {item.name}
      </div>
    ))}
  </div>
);
```

### Conditional Rendering

- Use early returns for conditional rendering
- Avoid unnecessary conditional checks
- Use proper loading and error states
- Implement proper fallback UI

## Bundle Optimization

### Code Splitting

- Use `React.lazy()` for route-based splitting
- Implement proper loading states
- Use dynamic imports for heavy components
- Monitor bundle size regularly

```typescript
// ✅ Good: Lazy loading with proper fallback
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <HeavyComponent />
  </Suspense>
);
```

### Import Optimization

- Use named imports over default imports
- Use barrel exports for cleaner imports
- Avoid importing unused code
- Use tree shaking effectively

## Performance Monitoring

### Development Tools

- Use React DevTools Profiler
- Monitor component re-renders
- Track bundle size changes
- Use performance monitoring tools

### Production Monitoring

- Implement performance metrics
- Monitor real user performance
- Track Core Web Vitals
- Use error tracking and monitoring

## Memory Management

### Memory Leaks Prevention

- Clean up subscriptions and timers
- Remove event listeners properly
- Avoid circular references
- Use proper cleanup in useEffect

### Resource Management

- Optimize image loading and caching
- Use proper loading strategies
- Implement proper error boundaries
- Monitor memory usage

## State Updates

### Efficient State Updates

- Use functional updates for state
- Batch state updates when possible
- Avoid unnecessary state updates
- Use proper state update patterns

```typescript
// ✅ Good: Functional state update
const [count, setCount] = useState(0);

const increment = useCallback(() => {
  setCount((prev) => prev + 1);
}, []);

// ❌ Bad: Direct state reference
const increment = useCallback(() => {
  setCount(count + 1); // May use stale closure
}, [count]);
```

### Context Optimization

- Split contexts for different concerns
- Use context selectors when possible
- Avoid unnecessary context updates
- Implement proper context providers

# React Performance Rules

## Component Optimization

### Memoization Strategy

- Use `React.memo()` for expensive components
- Use `useCallback()` for event handlers passed to children
- Use `useMemo()` for expensive calculations
- Avoid premature optimization

### Component Structure

```typescript
// ✅ Good: Memoized component with optimized props
const ExpensiveComponent = React.memo(({ data, onAction }: Props) => {
  const processedData = useMemo(() => processData(data), [data]);

  const handleClick = useCallback(() => {
    onAction(processedData);
  }, [onAction, processedData]);

  return <div onClick={handleClick}>{/* component content */}</div>;
});

// ❌ Bad: No optimization, re-renders unnecessarily
const ExpensiveComponent = ({ data, onAction }: Props) => {
  const processedData = processData(data); // Recalculated on every render

  return <div onClick={() => onAction(processedData)}>{/* content */}</div>;
};
```

### State Management

- Keep state as close to where it's used as possible
- Use local state for component-specific data
- Use context for shared state across components
- Use external state management for global state

## Hook Optimization

### useEffect Best Practices

- Always include proper dependency arrays
- Clean up side effects in return function
- Avoid infinite re-render loops
- Use multiple useEffect hooks for different concerns

```typescript
// ✅ Good: Proper useEffect with cleanup
useEffect(() => {
  const subscription = subscribeToData();

  return () => {
    subscription.unsubscribe();
  };
}, [dependencies]);

// ❌ Bad: Missing dependencies or cleanup
useEffect(() => {
  subscribeToData(); // No cleanup, potential memory leak
}, []); // Missing dependencies
```

### Custom Hook Optimization

- Extract reusable logic into custom hooks
- Use proper dependency arrays in custom hooks
- Return stable references when possible
- Document hook dependencies clearly

## Rendering Optimization

### List Rendering

- Use `key` prop for list items
- Use virtualization for large lists
- Avoid inline functions in map
- Use `React.memo()` for list items

```typescript
// ✅ Good: Optimized list rendering
const ListItem = React.memo(({ item, onSelect }: ListItemProps) => (
  <div onClick={() => onSelect(item.id)}>{item.name}</div>
));

const List = ({ items, onSelect }: ListProps) => (
  <div>
    {items.map(item => (
      <ListItem key={item.id} item={item} onSelect={onSelect} />
    ))}
  </div>
);

// ❌ Bad: Inline functions and no memoization
const List = ({ items, onSelect }: ListProps) => (
  <div>
    {items.map(item => (
      <div key={item.id} onClick={() => onSelect(item.id)}>
        {item.name}
      </div>
    ))}
  </div>
);
```

### Conditional Rendering

- Use early returns for conditional rendering
- Avoid unnecessary conditional checks
- Use proper loading and error states
- Implement proper fallback UI

## Bundle Optimization

### Code Splitting

- Use `React.lazy()` for route-based splitting
- Implement proper loading states
- Use dynamic imports for heavy components
- Monitor bundle size regularly

```typescript
// ✅ Good: Lazy loading with proper fallback
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <HeavyComponent />
  </Suspense>
);
```

### Import Optimization

- Use named imports over default imports
- Use barrel exports for cleaner imports
- Avoid importing unused code
- Use tree shaking effectively

## Performance Monitoring

### Development Tools

- Use React DevTools Profiler
- Monitor component re-renders
- Track bundle size changes
- Use performance monitoring tools

### Production Monitoring

- Implement performance metrics
- Monitor real user performance
- Track Core Web Vitals
- Use error tracking and monitoring

## Memory Management

### Memory Leaks Prevention

- Clean up subscriptions and timers
- Remove event listeners properly
- Avoid circular references
- Use proper cleanup in useEffect

### Resource Management

- Optimize image loading and caching
- Use proper loading strategies
- Implement proper error boundaries
- Monitor memory usage

## State Updates

### Efficient State Updates

- Use functional updates for state
- Batch state updates when possible
- Avoid unnecessary state updates
- Use proper state update patterns

```typescript
// ✅ Good: Functional state update
const [count, setCount] = useState(0);

const increment = useCallback(() => {
  setCount((prev) => prev + 1);
}, []);

// ❌ Bad: Direct state reference
const increment = useCallback(() => {
  setCount(count + 1); // May use stale closure
}, [count]);
```

### Context Optimization

- Split contexts for different concerns
- Use context selectors when possible
- Avoid unnecessary context updates
- Implement proper context providers
