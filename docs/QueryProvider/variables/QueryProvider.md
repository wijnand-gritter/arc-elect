[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [QueryProvider](../README.md) / QueryProvider

# Variable: QueryProvider

> `const` **QueryProvider**: `React.FC`\<`QueryProviderProps`\>

Defined in: [renderer/components/QueryProvider.tsx:43](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/QueryProvider.tsx#L43)

QueryProvider component for react-query integration.

This component wraps the application with the QueryClientProvider,
enabling data fetching and caching capabilities. It uses the
singleton queryClient instance for consistent behavior.

## Param

Component props

## Param

Child components to wrap

## Returns

JSX element providing query context

## Example

```tsx
<QueryProvider>
  <App />
</QueryProvider>
```
