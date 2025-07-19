[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [ThemeProvider](../README.md) / ThemeProvider

# Function: ThemeProvider()

> **ThemeProvider**(`props`): `Element`

Defined in: [renderer/components/ThemeProvider.tsx:71](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ThemeProvider.tsx#L71)

ThemeProvider component for theme management.

This component provides theme context and management functionality
for the application. It supports:

- Light, dark, and system themes
- Automatic theme persistence
- Synchronization with main process settings
- System theme detection

## Parameters

### props

`ThemeProviderProps`

Component props

## Returns

`Element`

JSX element providing theme context

## Example

```tsx
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```
