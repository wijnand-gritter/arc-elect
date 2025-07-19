[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [useAppStore](../README.md) / useAppStore

# Variable: useAppStore

> `const` **useAppStore**: `UseBoundStore`\<`Write`\<`StoreApi`\<`AppState`\>, `StorePersist`\<`AppState`, \{ `theme`: [`Theme`](../type-aliases/Theme.md); \}\>\>\>

Defined in: [renderer/stores/useAppStore.ts:58](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/stores/useAppStore.ts#L58)

Zustand store for global application state management.

This store provides:

- Theme management with IPC synchronization
- Page navigation state
- Persistent storage of theme preferences

## Example

```tsx
const theme = useAppStore((state) => state.theme);
const setTheme = useAppStore((state) => state.setTheme);

// Change theme
await setTheme('dark');
```
