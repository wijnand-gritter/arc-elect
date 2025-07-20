[**Arc Elect Documentation v1.0.0**](../../README.md)

---

[Arc Elect Documentation](../../modules.md) / [use-mobile](../README.md) / useMobile

# Function: useMobile()

> **useMobile**(): `boolean`

Defined in: [renderer/hooks/use-mobile.ts:35](https://github.com/wijnand-gritter/arc-elect/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/hooks/use-mobile.ts#L35)

Custom hook for detecting mobile devices.

This hook monitors the screen width and determines if the current
device is mobile based on a breakpoint of 768px. It provides
real-time updates when the screen size changes.

## Returns

`boolean`

Boolean indicating if the current device is mobile

## Example

```tsx
const isMobile = useMobile();

if (isMobile) {
  return <MobileLayout />;
} else {
  return <DesktopLayout />;
}
```
