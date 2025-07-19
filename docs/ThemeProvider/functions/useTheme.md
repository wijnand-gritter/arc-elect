[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [ThemeProvider](../README.md) / useTheme

# Function: useTheme()

> **useTheme**(): `ThemeContextType`

Defined in: [renderer/components/ThemeProvider.tsx:176](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ThemeProvider.tsx#L176)

Hook for accessing the theme context.

This hook provides access to the current theme and theme setter
function. It must be used within a ThemeProvider.

## Returns

`ThemeContextType`

Theme context with current theme and setter function

## Throws

Error if used outside of ThemeProvider

## Example

```tsx
const { theme, setTheme } = useTheme();

// Change theme
setTheme('dark');
```
