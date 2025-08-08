# DEV_GUIDELINES

## Project Structure & Core Frameworks

This starter app is designed for rapid, robust Electron + React development, with a focus on maintainability, scalability, and best practices. All core frameworks and patterns are implemented and documented below.

### Directory Structure

- `src/main/` — Main process code (Electron entry, IPC handlers, settings, logging, performance monitoring)
- `src/preload/` — Preload scripts (secure IPC bridge)
- `src/renderer/` — Renderer (React) app
  - `components/` — Shared and page-specific React components
    - `ui/` — All reusable UI components (shadcn/ui, custom, icons)
  - `pages/` — Page components for routing
  - `stores/` — Zustand stores for global state
  - `styles/` — Global CSS, Tailwind config, design tokens
  - `lib/` — Utilities, error handling, logging, etc.
  - `hooks/` — Custom React hooks
- `src/types/` — TypeScript type declarations (e.g., IPC bridge)
- `tests/` — Test files (E2E tests with Playwright)
- `DEV_GUIDELINES.md` — This documentation

### Core Frameworks & Patterns

- **State Management:** Zustand (`src/renderer/stores/useAppStore.ts`)
- **Settings Persistence:** electron-store (via IPC bridge, see `main-store.ts`)
- **UI Framework:** shadcn/ui, Tailwind CSS, lucide-react (see `components/ui/`)
- **Notifications:** Sonner (toasts)
- **Navigation:** State-based navigation with TopNavigationBar (see `stores/useAppStore.ts`)
- **Logging:** electron-log (main and renderer)
- **Error Handling:** Custom framework, ErrorBoundary, safeHandler
- **IPC Bridge:** Secure communication between renderer and main (see `preload/`)
- **Theme:** ThemeProvider, CSS variables, light/dark/system support
- **Performance Monitoring:** Custom performance tracking (see `performance-monitor.ts`)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting/Formatting:** ESLint, Prettier, Commitlint, Husky

### How to extend

- **Add a new page:** Create a file in `pages/`, add it to the `Page` type in `stores/useAppStore.ts`, and add it to the navigation in `components/TopNavigationBar.tsx`.
- **Add a new UI component:** Use shadcn/ui CLI or add to `components/ui/`.
- **Add global state:** Extend zustand store in `stores/`.
- **Add a new setting:** Add to electron-store schema in `main-store.ts` and expose via IPC.
- **Add a new style/design token:** Add to `styles/globals.css` under `:root` and `.dark`.
- **Add a new notification:** Use Sonner's `toast()` in any component.
- **Add a new IPC method:** Add handler in `main/`, expose in `preload/`, type in `types/ipc-api.d.ts`.

---

**See the sections below for detailed usage, examples, and best practices for each framework.**

## Error handling, logging and notifications

### 1. Logging

- Always use the central logger (`main-logger.ts` or `renderer-logger.ts`) for all important events, errors, and information.
- Log with context and clear messages.
- Example:
  ```ts
  import logger from './lib/renderer-logger';
  logger.info('User logged in', userId);
  logger.error('Error fetching data', error);
  ```
- Electron-log automatically handles log rotation and file storage.

### 2. Error handling

- **Main process:**
  - Uncaught exceptions and promise rejections are automatically logged and the process exits after a short delay.
- **Renderer process:**
  - Global errors (`window.onerror`, `window.onunhandledrejection`) are logged and shown as a toast notification.
  - Use the `ErrorBoundary` component to catch render errors in React components, show a fallback UI, and display a toast.
  - Use the `safeHandler` utility to catch, log, and show toasts for errors in event handlers.
- Example safeHandler:
  ```ts
  import { safeHandler } from './lib/error-handling';
  <button
    onClick={safeHandler(() => {
      /* ... */
    })}
  >
    Click
  </button>;
  ```
- Example ErrorBoundary:
  ```tsx
  import { ErrorBoundary } from './components/ErrorBoundary';
  <ErrorBoundary>
    <App />
  </ErrorBoundary>;
  ```

### 3. Notifications (toasts)

- Use Sonner for all user notifications (error, success, info, warning).
- Example:
  ```ts
  import { toast } from 'sonner';
  toast.success('Action successful!', { description: 'Data has been saved.' });
  toast.error('Error!', { description: 'Something went wrong.' });
  toast('Attention!', { description: 'You have unsaved changes.' });
  ```
- Notifications can be used anywhere in the renderer, including event handlers, services, or after IPC events.

### 4. Best practices

- Always log relevant errors and important actions.
- Only show toasts for relevant messages (avoid spamming the user).
- Use ErrorBoundary for component errors, safeHandler for event handlers, and global handlers for everything else.
- Keep logging (for developers) and notifications (for users) separate.

## 5. IPC Bridge for File Operations

### Overview

- The IPC bridge provides a secure way for the renderer to read and write files via the main process.
- The API is exposed in the preload script as `window.api`.
- All file operations are validated and logged in the main process.
- TypeScript types for the bridge are defined in `src/types/ipc-api.d.ts`.

### Usage

- **Renderer:**

  ```ts
  // Read a file
  const result = await window.api.readFile('/path/to/file.txt');
  if (result.success) {
    // Use result.data
  } else {
    // Show error notification
  }

  // Write a file
  const writeResult = await window.api.writeFile(
    '/path/to/file.txt',
    'Hello World',
  );
  if (!writeResult.success) {
    // Show error notification
  }
  ```

- **Preload:**
  - Exposes the API using `contextBridge.exposeInMainWorld`.
- **Main:**
  - Handles `file:read` and `file:write` with validation, logging, and error handling.

### Best practices

- Only expose the minimal API needed in the preload script.
- Always validate file paths and data in the main process.
- Log all file operations and errors using the main logger.
- Never access Node.js or Electron APIs directly from the renderer—always use the bridge.

---

With this IPC bridge, your app can safely perform file operations from the renderer, following Electron security best practices.

With this structure, your app is robust, maintainable, and user-friendly for both developers and end users.

## 6. App State Management with Zustand & Settings

### Overview

- Use Zustand for global app state management in the renderer.
- The main store is in `src/renderer/stores/useAppStore.ts`.
- The theme (light, dark, system) is synchronized with the main process settings via the IPC bridge.

### Usage

- **Access and update theme:**

  ```ts
  import { useAppStore } from '../stores/useAppStore';
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  // Set theme
  await setTheme('dark');
  ```

- **Load theme on startup:**
  ```ts
  // In your App component or a useEffect
  useEffect(() => {
    useAppStore.getState().loadTheme();
  }, []);
  ```
- The store automatically syncs theme changes with the main process settings (electron-store).

### Best practices

- Use Zustand for all global state that needs to be shared between components.
- Always use the provided store methods to update state, so changes are persisted.
- Extend the store with more settings or app state as needed.

---

With this setup, your app state and user settings are always in sync and easy to manage.

## 7. Theme Framework (Light/Dark/System)

### Overview

- The theme framework is based on a central `ThemeProvider` (see `src/renderer/components/ThemeProvider.tsx`), compatible with shadcn/ui and Tailwind.
- Theme state (`light`, `dark`, `system`) is managed via zustand and persisted with electron-store.
- The theme is applied by toggling the `dark` class on `<html>`, enabling Tailwind and CSS variable theming.
- All color, radius, and other design tokens are defined as CSS variables in `src/renderer/styles/globals.css`.

### Usage

- **Wrap your app in the ThemeProvider:**
  ```tsx
  import { ThemeProvider } from '@/components/ThemeProvider';
  // ...
  <ThemeProvider>{/* ...your app... */}</ThemeProvider>;
  ```
- **Switch theme from anywhere:**
  ```tsx
  import { useTheme } from '@/components/ThemeProvider';
  const { setTheme } = useTheme();
  setTheme('dark'); // or "light" or "system"
  ```
- **Theme is also synced with zustand:**
  ```tsx
  import { useAppStore } from '../stores/useAppStore';
  const theme = useAppStore((state) => state.theme);
  ```
- **Add a mode toggle:**
  Use the `ModeToggle` component (`src/renderer/components/ModeToggle.tsx`) for a ready-to-use theme switcher.

### CSS Variables

- All theme colors and tokens are defined in `globals.css` under `:root` and `.dark`.
- Use them in your CSS or Tailwind config for consistent theming.

### Best practices

- Always use the ThemeProvider at the root of your app.
- Use the zustand store and/or ThemeProvider context to read or set the theme.
- Use CSS variables for all custom colors and design tokens.
- Extend the theme system by adding new variables to `globals.css` and referencing them in your components or Tailwind config.
- For custom themes, add new classes and variables as needed.

---

With this theme framework, your app supports light, dark, and system themes out of the box, is fully customizable, and works seamlessly with shadcn/ui and Tailwind.

## 8. Styling Best Practices

### Overview

- All styling is done using Tailwind CSS utility classes and custom CSS variables.
- Base styles and design tokens (colors, radius, etc.) are defined in `src/renderer/styles/globals.css`.
- UI components use shadcn/ui for consistent, accessible, and customizable design.
- Icons are provided by `lucide-react` and can be used in any component.

### How to style components

- Use Tailwind utility classes for layout, spacing, typography, etc.:
  ```tsx
  <div className="p-4 bg-background text-foreground rounded-lg">...</div>
  ```
- Use CSS variables for colors and design tokens:
  ```css
  background: var(--background);
  color: var(--foreground);
  border-radius: var(--radius);
  ```
- Reference variables in your Tailwind config if you need custom classes.
- For icons:
  ```tsx
  import { Sun } from 'lucide-react';
  <Sun className="w-4 h-4 text-primary" />;
  ```

### Adding new styles

- Add new design tokens (colors, radius, etc.) to `globals.css` under `:root` and `.dark`.
- Use these variables in your components and Tailwind config for consistency.
- For new UI components, use the shadcn/ui CLI to generate a base and customize as needed.

### Best practices

- Keep all shared and reusable UI components in `src/renderer/components/ui/`.
- Use Tailwind utility classes and CSS variables for all styling.
- Prefer composition and reuse over duplication.
- Document any custom components or styles with a file-level comment.
- Keep your UI consistent by always using the design tokens and utility classes.

---

With these styling practices, your app will be visually consistent, easy to maintain, and quick to extend for all developers.

## 9. Navigation Best Practices

### Overview

- All navigation is handled with state-based navigation using Zustand.
- The central navigation state is managed in `src/renderer/stores/useAppStore.ts`.
- All page components are in `src/renderer/pages/`.
- Navigation is handled through the `PageContent` component and TopNavigationBar.

### How to add a new page

1. Create a new page component in `src/renderer/pages/`, e.g. `About.tsx`.
2. Add the page to the `Page` type in `src/renderer/stores/useAppStore.ts`:
   ```ts
   export type Page = 'home' | 'about' | 'settings' | 'newpage';
   ```
3. Add the page to the `PageContent` component in `src/renderer/components/PageContent.tsx`:
   ```tsx
   {
     currentPage === 'newpage' && <NewPage />;
   }
   ```
4. Add a navigation link in the TopNavigationBar (see `src/renderer/components/TopNavigationBar.tsx`):
   ```tsx
   {
     title: "New Page",
     page: "newpage" as const,
     icon: IconNew,
   }
   ```

### Best practices

- Keep all page components in `src/renderer/pages/` for clarity and maintainability.
- Use semantic page names in the `Page` type.
- Add new pages to both the store type and the PageContent component.
- Document new pages and their purpose with a file-level comment in the page component.
- Use state-based navigation for instant page switching without routing overhead.

---

With this navigation setup, adding or changing pages is simple, clear, and provides instant navigation for desktop apps.

## 10. Form Handling & Validation (react-hook-form + zod)

### Overview

- All forms in the app use [react-hook-form](https://react-hook-form.com/) for state management and [zod](https://zod.dev/) for schema validation.
- This setup ensures robust, type-safe, and user-friendly forms for all user input.

### How to create a new form

1. Create a new component in `components/` or `pages/`.
2. Import `useForm` from `react-hook-form` and `zod` for your schema:
   ```tsx
   import { useForm } from 'react-hook-form';
   import { z } from 'zod';
   import { zodResolver } from '@hookform/resolvers/zod';
   ```
3. Define your schema and form fields:

   ```tsx
   const schema = z.object({
     name: z.string().min(1, 'Name is required'),
     email: z.string().email(),
   });
   type FormData = z.infer<typeof schema>;

   const form = useForm<FormData>({
     resolver: zodResolver(schema),
   });
   ```

4. Use the form in your component:
   ```tsx
   <form
     onSubmit={form.handleSubmit((data) => {
       /* handle data */
     })}
   >
     <input {...form.register('name')} />
     {form.formState.errors.name && (
       <span>{form.formState.errors.name.message}</span>
     )}
     <button type="submit">Submit</button>
   </form>
   ```

### Best practices

- Always use zod schemas for validation and type safety.
- Show clear error messages for invalid input.
- Use react-hook-form's `formState` for error and loading states.
- Keep forms modular and reusable.

---

With this setup, all forms are robust, validated, and easy to maintain.

## 11. Data Fetching & Caching (react-query)

### Overview

- All data fetching and caching is handled with [react-query (TanStack Query)](https://tanstack.com/query/latest).
- The base setup is in `src/renderer/lib/queryClient.ts` and `src/renderer/components/QueryProvider.tsx`.
- This provides robust, cache-first data fetching, background updates, and easy loading/error states.

### How to use react-query

1. Wrap your app in the `QueryProvider` (see `App.tsx`):
   ```tsx
   import { QueryProvider } from '@/components/QueryProvider';
   <QueryProvider>{/* ...your app... */}</QueryProvider>;
   ```
2. Use the `useQuery` or `useMutation` hooks in your components:

   ```tsx
   import { useQuery } from '@tanstack/react-query';

   function DataComponent() {
     const { data, isLoading, error } = useQuery({
       queryKey: ['data'],
       queryFn: async () => {
         const res = await fetch('/api/data');
         if (!res.ok) throw new Error('Failed to fetch');
         return res.json();
       },
     });
     // ...render logic
   }
   ```

### Best practices

- Use `queryKey` arrays for cache and refetch control.
- Use `useMutation` for POST/PUT/DELETE and invalidate queries as needed.
- Handle loading and error states in your UI.
- Use the React Query Devtools in development for debugging.
- Prefer react-query for all async data, even for local/IPC data, for consistency.

---

With react-query, your app has robust, cache-first data fetching and is ready for any API or async data source.

## 12. Performance Monitoring

### Overview

- Performance monitoring is handled by a custom performance monitor in `src/main/performance-monitor.ts`.
- Tracks key application events and provides timing information for optimization.
- Automatically logs performance data during development and startup.

### Usage

- **Track performance checkpoints:**

  ```ts
  import { performanceMonitor } from './performance-monitor';

  performanceMonitor.checkpoint('app-start');
  // ... some work ...
  performanceMonitor.checkpoint('app-ready');
  ```

- **Get performance summary:**
  ```ts
  performanceMonitor.summary(); // Logs all checkpoints with timing
  ```

### Best practices

- Add checkpoints at key application milestones.
- Monitor startup time, window creation, and critical user interactions.
- Use performance data to identify bottlenecks.
- Keep monitoring lightweight to avoid impacting performance.

---

With performance monitoring, you can track and optimize your app's performance throughout development.

## 13. Security Best Practices

### Overview

- Electron apps require careful security considerations to prevent vulnerabilities.
- This boilerplate implements several security measures out of the box.

### Security Measures

- **Context Isolation:** Enabled by default in preload script
- **Node Integration:** Disabled for renderer process
- **Sandbox:** Disabled but can be enabled for additional security
- **IPC Validation:** All IPC calls are validated in the main process
- **File Path Validation:** File operations validate paths and data
- **Window Creation Control:** New windows are blocked by default

### Best practices

- Never enable `nodeIntegration` in production
- Always validate IPC data in the main process
- Use contextBridge for secure API exposure
- Validate file paths before file operations
- Keep dependencies updated
- Use CSP headers when serving content

### IPC Security

```ts
// Always validate in main process
ipcMain.handle('api:action', async (event, data) => {
  // Validate data
  if (!isValidData(data)) {
    return { success: false, error: 'Invalid data' };
  }

  // Process safely
  return { success: true, result: processData(data) };
});
```

---

Following these security practices ensures your Electron app is secure and follows best practices.

## 14. E2E Testing (Playwright)

### Overview

- End-to-End testing is handled with [Playwright](https://playwright.dev/).
- Tests are located in `tests/e2e/` and run against the actual application.
- Configuration is in `playwright.config.ts`.

### Running E2E Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run tests in headed mode (see browser)
pnpm run test:e2e:headed

# Run tests for specific browser
pnpm run test:e2e:chromium

# Open Playwright report
pnpm run test:e2e:report
```

### Writing E2E Tests

- Tests are in `tests/e2e/examples/` and `tests/e2e/specs/`.
- Use descriptive test names and group related tests with `test.describe()`.
- Test user workflows, not implementation details.
- Use page objects for reusable selectors and actions.
- Keep tests independent and isolated.

### Example Test Structure

```tsx
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading')).toBeVisible();
    // ... more test logic
  });
});
```

### Best Practices

- Use semantic selectors (getByRole, getByText) over CSS selectors.
- Test real user interactions and workflows.
- Use `expect().toBeVisible()` for visibility checks.
- Handle async operations properly with `await`.
- Use test fixtures for common setup.

---

With Playwright, your app has comprehensive E2E testing coverage for real user scenarios.

## 15. Unit Testing (Vitest)

### Overview

- Unit testing is handled with [Vitest](https://vitest.dev/).
- Fast, modern testing framework compatible with Vite.
- Supports TypeScript, React Testing Library, and more.

### Running Unit Tests

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test -- --watch

# Run tests with coverage
pnpm run test -- --coverage
```

### Writing Unit Tests

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Best practices

- Test component behavior, not implementation details.
- Use React Testing Library for component testing.
- Mock external dependencies appropriately.
- Keep tests focused and isolated.
- Use descriptive test names.

---

With Vitest, you have fast, reliable unit testing for your components and utilities.

## 16. App Updates (electron-updater) - Optional Production Step

### Overview

- [electron-updater](https://www.electron.build/auto-update) handles automatic app updates in production.
- This is an optional step for production builds, not needed during development.
- Works with electron-forge for seamless update distribution.

### When to Use

- Production applications that need automatic updates
- Apps distributed via GitHub releases, S3, or other update servers
- When you want users to get updates without manual downloads

### Setup (Production Only)

1. Install electron-updater:

   ```bash
   pnpm add electron-updater
   ```

2. Configure in `forge.config.ts`:

   ```ts
   import { MakerDMG } from '@electron-forge/maker-dmg';
   import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
   import { WebpackPlugin } from '@electron-forge/plugin-webpack';
   import { PublisherGithub } from '@electron-forge/publisher-github';

   export default {
     packagerConfig: {
       asar: true,
     },
     rebuildConfig: {},
     makers: [new MakerDMG({})],
     plugins: [
       new AutoUnpackNativesPlugin({}),
       new WebpackPlugin({
         mainConfig: './webpack.main.config.js',
         renderer: {
           config: './webpack.renderer.config.js',
           entryPoints: [
             {
               html: './src/index.html',
               js: './src/renderer.ts',
               name: 'main_window',
               preload: {
                 js: './src/preload.ts',
               },
             },
           ],
         },
       }),
     ],
     publishers: [
       new PublisherGithub({
         repository: {
           owner: 'your-username',
           name: 'your-repo-name',
         },
       }),
     ],
   };
   ```

3. Implement update logic in main process:

   ```ts
   import { autoUpdater } from 'electron-updater';
   import { app } from 'electron';

   // Check for updates on app start
   app.whenReady().then(() => {
     autoUpdater.checkForUpdatesAndNotify();
   });

   // Handle update events
   autoUpdater.on('update-available', () => {
     // Notify user
   });

   autoUpdater.on('update-downloaded', () => {
     // Prompt user to restart
   });
   ```

### Best Practices

- Only enable in production builds
- Test update flow thoroughly before release
- Provide clear user feedback during updates
- Handle update failures gracefully
- Use code signing for macOS/Windows

### Alternative: Manual Updates

For simpler apps, consider manual update notifications directing users to download new versions.

---

electron-updater provides seamless automatic updates for production Electron apps.

## 17. Build & Deployment

### Overview

- Build process uses electron-forge with Vite for fast development and optimized production builds.
- Supports multiple platforms (Windows, macOS, Linux).
- Configurable packaging and distribution options.

### Build Commands

```bash
# Development
pnpm run dev          # Start development server

# Production builds
pnpm run build        # Build renderer
pnpm run package      # Package app
pnpm run make         # Create distributables
pnpm run publish      # Publish to distribution platform
```

### Configuration

- **electron-forge:** `forge.config.ts` - Main build configuration
- **Vite:** `vite.main.config.mts`, `vite.renderer.config.mts` - Build tool configs
- **TypeScript:** `tsconfig.json` - TypeScript configuration

### Best Practices

- Use different configurations for development and production
- Optimize bundle size for production
- Test builds on target platforms
- Use code signing for distribution
- Configure auto-updates if needed

---

With this build setup, you can easily create distributable packages for all major platforms.

## 18. Development Workflow

### Overview

- Optimized development workflow with hot reload, debugging, and development tools.
- Clear separation between development and production environments.

### Development Features

- **Hot Reload:** Automatic reloading on file changes
- **DevTools:** React DevTools and Electron DevTools in development
- **Debugging:** VS Code debugging configurations
- **Error Overlay:** Clear error messages during development

### Development vs Production

```ts
// Development features
if (process.env.NODE_ENV === 'development') {
  // Enable DevTools
  mainWindow.webContents.openDevTools();

  // Install React DevTools
  installExtension(REACT_DEVELOPER_TOOLS);
}
```

### Best Practices

- Use development mode for debugging and testing
- Keep development tools disabled in production
- Use environment variables for configuration
- Test production builds regularly

---

This development workflow provides a smooth development experience while maintaining production readiness.

## 19. Accessibility Testing

### Overview

- Accessibility testing ensures your app meets WCAG (Web Content Accessibility Guidelines) standards.
- Uses custom utilities for manual validation and accessibility checking.
- Helps create inclusive applications for users with disabilities.

### Setup

- No additional packages needed - uses manual validation.

### Usage

#### Manual Validation

```tsx
// Validate components manually
const button = document.querySelector('button');
if (button) {
  // Check for accessible text
  const hasText =
    button.textContent?.trim() || button.getAttribute('aria-label');
  console.log('Button accessible:', !!hasText);
}
```

#### Using Accessibility Attributes

```tsx
// Use common ARIA roles and labels
<nav role="navigation">
  <button aria-label="Close">
    <XIcon />
  </button>
</nav>
```

#### Testing

```tsx
// Test accessibility in your test files
describe('Accessibility', () => {
  it('should have accessible buttons', () => {
    const button = document.querySelector('button');
    const hasText =
      button?.textContent?.trim() || button?.getAttribute('aria-label');
    expect(hasText).toBeTruthy();
  });
});
```

### Best Practices

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Provide alt text for images
- Ensure keyboard navigation works
- Use proper ARIA attributes
- Test with screen readers
- Maintain color contrast ratios

### Testing Checklist

- [ ] All images have alt text
- [ ] All buttons have accessible text
- [ ] All form inputs have labels
- [ ] Color contrast meets WCAG standards
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Focus management is logical
- [ ] ARIA attributes are used correctly

---

Accessibility testing ensures your app is usable by everyone, including users with disabilities.

## 20. Component Architecture

### Overview

- Well-organized component structure following React best practices.
- Clear separation of concerns and reusable component patterns.

### Component Organization

```
components/
├── ui/           # Reusable UI components (shadcn/ui)
├── pages/        # Page-specific components
├── layout/       # Layout components (AppLayout, TopNavigationBar)
└── providers/    # Context providers (ThemeProvider, QueryProvider)
```

### Component Patterns

#### Presentational Components

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
}) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

#### Container Components

```tsx
export const UserProfile: React.FC = () => {
  const user = useAppStore((state) => state.user);

  return (
    <div>
      <h1>{user.name}</h1>
      <UserAvatar user={user} />
    </div>
  );
};
```

### Best Practices

- Keep components focused and single-purpose
- Use TypeScript interfaces for props
- Prefer composition over inheritance
- Use custom hooks for logic reuse
- Document complex components with JSDoc

---

This component architecture provides a scalable and maintainable structure for your React components.

## 21. Git & Conventional Commits

### Overview

- This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
- Commit messages are automatically validated using [commitlint](https://commitlint.js.org/) and [husky](https://typicode.github.io/husky/).
- This ensures consistent, readable commit history and enables automatic changelog generation.

### Commit Message Format

```
type(scope): description
```

**Rules:**

- `type` and `scope` are lowercase
- `scope` allows hyphens, multiple scopes separated by commas (no trailing commas)
- No space before colon, exactly one space after
- `description` starts lowercase and has no trailing period

### Commit Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
# Feature with scope
git commit -m "feat(ui): add dark mode toggle"

# Bug fix
git commit -m "fix: resolve navigation state sync issue"

# Documentation
git commit -m "docs: update installation instructions"

# Multiple scopes
git commit -m "feat(ui,api): add user profile and authentication"

# Breaking change (use ! after type)
git commit -m "feat!: change API response format"
```

### Breaking Changes

- Use `!` after the type to indicate a breaking change
- Example: `feat!: change API response format`
- Breaking changes should be documented in the commit body

### Best Practices

- Use descriptive commit messages that explain what and why, not how
- Keep the description under 72 characters
- Use the imperative mood ("add" not "added")
- Reference issues when applicable: `fix: resolve #123`
- Group related changes in a single commit
- Use scopes to indicate which part of the codebase is affected

### Automatic Validation

- Husky pre-commit hooks validate commit messages
- Invalid commits will be rejected with helpful error messages
- The validation ensures consistent commit history across the team

---

Conventional commits provide a standardized way to write commit messages, making the project history more readable and enabling automated tools for changelog generation and version management.

## 22. Pre-commit Hooks & Code Quality

### Overview

- This project uses [Husky](https://typicode.github.io/husky/) for Git hooks
- Pre-commit hooks automatically run code quality checks before each commit
- This ensures consistent code quality and prevents broken code from being committed

### Available Hooks

#### Pre-commit Hook (`.husky/pre-commit`)

- **Purpose:** Runs before each commit to ensure code quality
- **Current setup:**
  ```bash
  pnpm run format  # Prettier formatting
  # pnpm run lint  # ESLint checking (temporarily disabled)
  ```
- **What it does:**
  - Formats all code with Prettier
  - Ensures consistent code style across the project
  - Can be extended to include linting, testing, etc.

#### Commit-msg Hook (`.husky/commit-msg`)

- **Purpose:** Validates commit message format
- **What it does:**
  - Enforces conventional commit format
  - Prevents duplicate commit messages
  - Runs commitlint validation

### Configuration Files

#### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "jsxSingleQuote": false,
  "arrowParens": "always",
  "endOfLine": "auto",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

#### ESLint (`eslint.config.mjs`)

- Modern ESLint v9 configuration
- TypeScript support with `@typescript-eslint`
- Import validation with `eslint-plugin-import`
- Ignores `dist/`, `node_modules/`, and build files
- Includes global definitions for browser and Node.js APIs

### Available Scripts

```bash
# Format code with Prettier
pnpm run format

# Lint code with ESLint
pnpm run lint

# Run both formatting and linting
pnpm run format && pnpm run lint
```

### Customizing Hooks

#### Adding New Pre-commit Checks

```bash
# Edit the pre-commit hook
nano .husky/pre-commit

# Add new commands
pnpm run test
pnpm run build
```

#### Temporarily Bypassing Hooks

```bash
# Skip pre-commit hooks (use with caution)
git commit --no-verify -m "feat: add new feature"

# Skip specific hook
git commit -m "feat: add new feature" --no-verify
```

### Best Practices

- **Never bypass hooks in production code** - Always fix issues instead
- **Keep hooks fast** - Pre-commit hooks should complete quickly
- **Use staging hooks** - Consider using pre-push hooks for slower operations
- **Document customizations** - Update this guide when adding new hooks

### Troubleshooting

#### Hook Not Running

```bash
# Ensure hooks are executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# Reinstall husky
pnpm run prepare
```

#### ESLint Errors

- Check `eslint.config.mjs` for configuration issues
- Ensure all dependencies are installed
- Verify TypeScript types are correct

#### Prettier Issues

- Check `.prettierrc` configuration
- Ensure Prettier is installed: `pnpm add -D prettier`
- Verify file extensions are supported

---

Pre-commit hooks ensure code quality and consistency across the entire team, preventing common issues before they reach the repository.

## 23. VS Code Development Setup

### Overview

- This project includes a complete VS Code workspace configuration
- Optimized for Electron + React + TypeScript development
- Includes debug configurations, tasks, and recommended extensions

### Workspace Configuration

#### Debug Configurations (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/electron/cli.js",
      "args": ["."],
      "cwd": "${workspaceFolder}",
      "env": { "NODE_ENV": "development" },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Electron Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/src/renderer"
    },
    {
      "name": "Debug Electron (Full)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/electron/cli.js",
      "args": ["."],
      "preLaunchTask": "npm: dev"
    }
  ]
}
```

#### Tasks (`.vscode/tasks.json`)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: dev",
      "type": "npm",
      "script": "dev",
      "group": "build"
    },
    {
      "label": "npm: build",
      "type": "npm",
      "script": "build",
      "group": "build"
    },
    {
      "label": "npm: lint",
      "type": "npm",
      "script": "lint",
      "group": "test"
    },
    {
      "label": "npm: format",
      "type": "npm",
      "script": "format",
      "group": "build"
    }
  ]
}
```

#### Workspace Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.vite": true
  }
}
```

#### Recommended Extensions (`.vscode/extensions.json`)

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Using VS Code Features

#### Debugging

1. **F5** → Choose debug configuration
2. **Debug Electron Main** - Debug main process only
3. **Debug Electron Renderer** - Debug renderer process only
4. **Debug Electron (Full)** - Full debugging with dev server

#### Tasks

- **Ctrl+Shift+P** → "Tasks: Run Task"
- **npm: dev** - Start development server
- **npm: build** - Build for production
- **npm: lint** - Run ESLint
- **npm: format** - Run Prettier

#### Auto-formatting

- **Format on Save** - Automatically format files when saving
- **ESLint on Save** - Automatically fix ESLint issues
- **Manual formatting** - Shift+Alt+F to format current file

#### TypeScript Features

- **Auto-imports** - Automatic import suggestions
- **Type checking** - Real-time TypeScript error detection
- **IntelliSense** - Smart code completion and navigation

### Keyboard Shortcuts

```bash
# Debugging
F5                    # Start debugging
Ctrl+Shift+F5        # Stop debugging
F9                    # Toggle breakpoint

# Tasks
Ctrl+Shift+P         # Command palette
Ctrl+Shift+P         # "Tasks: Run Task"

# Formatting
Shift+Alt+F          # Format document
Ctrl+K Ctrl+F        # Format selection

# Navigation
Ctrl+P               # Quick open
Ctrl+Shift+P         # Command palette
Ctrl+T               # Go to symbol
```

### Best Practices

#### Development Workflow

1. **Open project** - VS Code will suggest installing recommended extensions
2. **Start debugging** - Use F5 to start debugging with the "Debug Electron (Full)" configuration
3. **Use tasks** - Run common commands via Ctrl+Shift+P → "Tasks: Run Task"
4. **Auto-format** - Let VS Code format your code on save

#### Extension Management

- **Install recommended extensions** - VS Code will prompt you
- **Keep extensions updated** - Regular updates ensure compatibility
- **Disable conflicting extensions** - Some extensions may conflict with project settings

#### Performance Tips

- **Exclude build folders** - `dist/`, `node_modules/` are excluded from search
- **Use workspace settings** - Project-specific settings override global settings
- **Limit file watchers** - Large projects may need to adjust file watching limits

### Troubleshooting

#### Debug Not Working

- Ensure Electron is installed: `pnpm install`
- Check port 9222 is available for renderer debugging
- Verify TypeScript configuration in `tsconfig.json`

#### Extensions Not Working

- Reload VS Code after installing extensions
- Check extension compatibility with VS Code version
- Verify workspace settings don't conflict with extensions

#### Performance Issues

- Disable unnecessary extensions
- Exclude large folders from search
- Use workspace-specific settings

---

VS Code configuration provides an optimized development experience with debugging, formatting, and task management specifically tailored for Electron + React development.
