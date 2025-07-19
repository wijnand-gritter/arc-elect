# E2E Tests

This directory contains End-to-End tests using Playwright.

## Purpose

E2E tests verify that the entire application works correctly from a user's perspective, testing real user workflows and interactions.

## Structure

- `tests/e2e/` - Main test directory
- `tests/e2e/examples/` - Example test files
- `tests/e2e/specs/` - Actual test specifications

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests for specific browser
npm run test:e2e:chromium

# Open Playwright report
npm run test:e2e:report
```

## Writing Tests

- Use descriptive test names
- Test user workflows, not implementation details
- Use page objects for reusable selectors
- Keep tests independent and isolated
