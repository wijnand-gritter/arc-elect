[**Electron Boilerplate Documentation v1.0.0**](../../README.md)

---

[Electron Boilerplate Documentation](../../modules.md) / [TopNavigationBar](../README.md) / default

# Function: default()

> **default**(`props`): `Element`

Defined in: [renderer/components/TopNavigationBar.tsx:222](https://github.com/wijnand-gritter/electron-boilerplate/blob/c2867786d8264971474ef9a0d9cc5a8943053f07/src/renderer/components/TopNavigationBar.tsx#L222)

TopNavigationBar component for main application navigation.

This component renders a responsive navigation bar with:

- Application logo and branding
- Main navigation menu with dropdowns
- User menu and authentication
- Action buttons (search, settings, help)
- Mobile-responsive design with hamburger menu

## Parameters

### props

`TopNavigationBarProps`

Component props

## Returns

`Element`

JSX element representing the navigation bar

## Example

```tsx
<TopNavigationBar logo={{ title: 'My App', url: '#', src: '', alt: 'logo' }} menu={customMenu} />
```
