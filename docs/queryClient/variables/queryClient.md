[**Arc Elect Documentation v1.0.0**](../../README.md)

---

[Arc Elect Documentation](../../modules.md) / [queryClient](../README.md) / queryClient

# Variable: queryClient

> `const` **queryClient**: `QueryClient`

Defined in: [renderer/lib/queryClient.ts:36](https://github.com/wijnand-gritter/arc-elect/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/lib/queryClient.ts#L36)

Singleton QueryClient instance for the application.

This QueryClient is configured with default settings suitable for
Electron applications. It provides:

- Default query retry behavior
- Cache management
- Background refetching
- Optimistic updates

## Example

```tsx
import { queryClient } from './lib/queryClient';

// Use in QueryProvider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```
