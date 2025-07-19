[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [error-handling](../README.md) / safeAsyncHandler

# Function: safeAsyncHandler()

> **safeAsyncHandler**\<`T`\>(`fn`): (...`args`) => `Promise`\<`void` \| `Awaited`\<`ReturnType`\<`T`\>\>\>

Defined in: [renderer/lib/error-handling.ts:72](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/lib/error-handling.ts#L72)

Wraps an async function with error handling and logging.

This function wraps an async event handler or other async function
with error catching, logging, and user notification. It handles both
synchronous errors and promise rejections.

## Type Parameters

### T

`T` _extends_ (...`args`) => `Promise`\<`any`\>

## Parameters

### fn

`T`

The async function to wrap with error handling

## Returns

A new async function that includes error handling

> (...`args`): `Promise`\<`void` \| `Awaited`\<`ReturnType`\<`T`\>\>\>

### Parameters

#### args

...`Parameters`\<`T`\>

### Returns

`Promise`\<`void` \| `Awaited`\<`ReturnType`\<`T`\>\>\>

## Example

```tsx
<button
  onClick={safeAsyncHandler(async () => {
    // This async function is now protected from errors
    await someAsyncOperation();
  })}
>
  Click me
</button>
```
