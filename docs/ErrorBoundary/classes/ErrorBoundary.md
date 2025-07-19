[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [ErrorBoundary](../README.md) / ErrorBoundary

# Class: ErrorBoundary

Defined in: [renderer/components/ErrorBoundary.tsx:59](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L59)

ErrorBoundary component for React error handling.

This component provides error boundary functionality for React applications.
It catches JavaScript errors in child components and displays a fallback UI.

Features:

- Catches JavaScript errors in component tree
- Logs errors for debugging
- Shows user-friendly error UI
- Provides error recovery options
- Displays toast notifications

## Example

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Extends

- `Component`\<`ErrorBoundaryProps`, `ErrorBoundaryState`\>

## Constructors

### Constructor

> **new ErrorBoundary**(`props`): `ErrorBoundary`

Defined in: [renderer/components/ErrorBoundary.tsx:60](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L60)

#### Parameters

##### props

`ErrorBoundaryProps`

#### Returns

`ErrorBoundary`

#### Overrides

`Component<ErrorBoundaryProps, ErrorBoundaryState>.constructor`

## Methods

### getDerivedStateFromError()

> `static` **getDerivedStateFromError**(`error`): `ErrorBoundaryState`

Defined in: [renderer/components/ErrorBoundary.tsx:74](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L74)

Static method to update state when an error occurs.

This method is called when an error is thrown in a child component.
It updates the component state to indicate an error has occurred.

#### Parameters

##### error

`Error`

The error that was thrown

#### Returns

`ErrorBoundaryState`

State update object

---

### componentDidCatch()

> **componentDidCatch**(`error`, `errorInfo`): `void`

Defined in: [renderer/components/ErrorBoundary.tsx:87](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L87)

Lifecycle method called when an error occurs.

This method is called after an error has been thrown in a child component.
It logs the error and shows a toast notification to the user.

#### Parameters

##### error

`Error`

The error that was thrown

##### errorInfo

`ErrorInfo`

Additional error information

#### Returns

`void`

#### Overrides

`Component.componentDidCatch`

---

### handleRetry()

> **handleRetry**(): `void`

Defined in: [renderer/components/ErrorBoundary.tsx:102](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L102)

Handles the retry action when user clicks the retry button.

This method resets the error state, allowing the component
to attempt rendering again.

#### Returns

`void`

---

### render()

> **render**(): `ReactNode`

Defined in: [renderer/components/ErrorBoundary.tsx:114](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/ErrorBoundary.tsx#L114)

Renders the component.

If an error has occurred, renders the fallback UI.
Otherwise, renders the child components normally.

#### Returns

`ReactNode`

JSX element representing the component

#### Overrides

`Component.render`
