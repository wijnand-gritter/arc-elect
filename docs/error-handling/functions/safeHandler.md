[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [error-handling](../README.md) / safeHandler

# Function: safeHandler()

> **safeHandler**\<`T`\>(`fn`): (...`args`) => `void` \| `ReturnType`\<`T`\>

Defined in: [renderer/lib/error-handling.ts:35](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/lib/error-handling.ts#L35)

Wraps a function with error handling and logging.

This function wraps an event handler or other function with error
catching, logging, and user notification. It prevents unhandled
errors from crashing the application and provides user feedback.

## Type Parameters

### T

`T` _extends_ (...`args`) => `any`

## Parameters

### fn

`T`

The function to wrap with error handling

## Returns

A new function that includes error handling

> (...`args`): `void` \| `ReturnType`\<`T`\>

### Parameters

#### args

...`Parameters`\<`T`\>

### Returns

`void` \| `ReturnType`\<`T`\>

## Example

```tsx
<button
  onClick={safeHandler(() => {
    // This function is now protected from errors
    throw new Error('Something went wrong');
  })}
>
  Click me
</button>
```
