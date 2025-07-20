[**Arc Elect Documentation v1.0.0**](../../README.md)

---

[Arc Elect Documentation](../../modules.md) / [utils](../README.md) / cn

# Function: cn()

> **cn**(...`inputs`): `string`

Defined in: [renderer/lib/utils.ts:37](https://github.com/wijnand-gritter/arc-elect/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/lib/utils.ts#L37)

Merges class names with Tailwind CSS conflict resolution.

This function combines multiple class name inputs and resolves
Tailwind CSS conflicts by keeping the last conflicting class.
It uses clsx for conditional classes and twMerge for conflict resolution.

## Parameters

### inputs

...`ClassValue`[]

Class names to merge (strings, objects, arrays, etc.)

## Returns

`string`

Merged class name string

## Example

```tsx
// Basic usage
cn('px-2 py-1', 'px-4'); // Returns 'py-1 px-4'

// Conditional classes
cn('base-class', isActive && 'active-class');

// With objects
cn('base', { conditional: true, hidden: false });
```
