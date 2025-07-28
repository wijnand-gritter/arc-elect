---
trigger: always_on
description:
globs:
---

# Git and Commit Rules

## Conventional Commits

### Commit Message Format

- Use conventional commit format: `type(scope): description`
- Keep description under 72 characters
- Use imperative mood ("add" not "added")
- Reference issues when applicable

```bash
# ✅ Good: Conventional commit format
git commit -m "feat(ui): add dark mode toggle component"
git commit -m "fix(auth): resolve login validation issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(store): simplify state management logic"

# ❌ Bad: Non-conventional format
git commit -m "added dark mode"
git commit -m "fixed bug"
git commit -m "updated docs"
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

### Scope Usage

- Use scope to indicate which part of the codebase is affected
- Use lowercase with hyphens for multi-word scopes
- Multiple scopes separated by commas (no trailing comma)
- Keep scopes concise and meaningful

```bash
# ✅ Good: Scoped commits
git commit -m "feat(ui,theme): add dark mode and theme switching"
git commit -m "fix(auth,api): resolve authentication token validation"
git commit -m "refactor(store,components): simplify state management"

# ❌ Bad: Unclear or missing scope
git commit -m "feat: add stuff"
git commit -m "fix: fix things"
```

### Breaking Changes

- Use `!` after the type to indicate a breaking change
- Document breaking changes in the commit body
- Use semantic versioning for releases

```bash
# ✅ Good: Breaking change commit
git commit -m "feat!: change API response format

BREAKING CHANGE: The API now returns data in a new format.
Migration guide: Update all API calls to handle the new response structure."

# ❌ Bad: Breaking change without proper indication
git commit -m "feat: change API format"
```

## Branch Strategy

### Branch Naming

- Use descriptive branch names
- Follow pattern: `type/description`
- Use lowercase with hyphens
- Keep names concise but descriptive

```bash
# ✅ Good: Descriptive branch names
git checkout -b feature/dark-mode-toggle
git checkout -b fix/login-validation
git checkout -b refactor/state-management
git checkout -b docs/update-readme

# ❌ Bad: Unclear branch names
git checkout -b feature
git checkout -b fix
git checkout -b new-stuff
```

### Branch Types

- **feature/**: New features or enhancements
- **fix/**: Bug fixes
- **refactor/**: Code refactoring
- **docs/**: Documentation updates
- **test/**: Test-related changes
- **chore/**: Maintenance tasks

### Branch Management

- Keep branches short-lived
- Delete branches after merging
- Use feature branches for new development
- Maintain clean branch history

## Code Review Process

### Review Standards

- Review for functionality and security
- Check for code quality and standards
- Ensure proper testing coverage
- Verify documentation updates

### Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met

### Review Comments

- Be constructive and specific
- Explain the "why" not just the "what"
- Suggest improvements when possible
- Use positive language

## Pre-commit Hooks

### Hook Configuration

- Use Husky for Git hooks
- Configure pre-commit hooks for code quality
- Set up commit-msg hooks for message validation
- Ensure hooks are executable

```bash
# ✅ Good: Pre-commit hook setup
#!/bin/sh
npm run format
npm run lint
npm run test

# ❌ Bad: No pre-commit checks
# No hooks configured
```

### Hook Best Practices

- Keep hooks fast and efficient
- Provide clear error messages
- Allow bypassing when necessary
- Document hook requirements

## Commit History Management

### Commit Organization

- Make atomic commits
- Group related changes together
- Use meaningful commit messages
- Avoid large, monolithic commits

### Interactive Rebase

- Use interactive rebase for clean history
- Squash related commits
- Reorder commits logically
- Edit commit messages when needed

```bash
# ✅ Good: Interactive rebase
git rebase -i HEAD~3

# Commands:
# pick - use commit
# reword - use commit, but edit the commit message
# edit - use commit, but stop for amending
# squash - use commit, but meld into previous commit
# fixup - like "squash", but discard this commit's log message
```

### Commit Message Editing

- Use `git commit --amend` for last commit
- Use interactive rebase for older commits
- Keep commit messages clear and descriptive
- Reference related issues and PRs

## Merge Strategies

### Merge vs Rebase

- Use rebase for feature branches
- Use merge for main branch integration
- Maintain clean, linear history
- Avoid merge commits in feature branches

```bash
# ✅ Good: Rebase workflow
git checkout feature/new-feature
# ... make changes ...
git commit -m "feat: add new feature"
git rebase main
git checkout main
git merge feature/new-feature

# ❌ Bad: Merge commits in feature branches
git checkout feature/new-feature
git merge main  # Creates unnecessary merge commit
```

### Conflict Resolution

- Resolve conflicts carefully
- Test after conflict resolution
- Communicate with team members
- Document complex resolutions

## Tagging and Releases

### Version Tagging

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases with descriptive messages
- Use annotated tags for releases
- Maintain release notes

```bash
# ✅ Good: Release tagging
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# ❌ Bad: Lightweight tags for releases
git tag v1.2.0
```

### Release Process

- Create release branches for major versions
- Use automated release tools when possible
- Generate changelogs from commit history
- Test releases before publishing

## Git Configuration

### Local Configuration

- Set up proper user information
- Configure default editor
- Set up signing keys for commits
- Configure aliases for common commands

```bash
# ✅ Good: Git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.editor "code --wait"
git config --global commit.gpgsign true

# Useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
```

### Repository Configuration

- Set up proper remote URLs
- Configure branch protection rules
- Set up automated workflows
- Configure issue templates

## Collaboration Guidelines

### Team Workflow

- Use pull requests for code review
- Require approval before merging
- Use draft PRs for work in progress
- Maintain clear communication

### Conflict Prevention

- Communicate changes with team
- Use feature flags for large changes
- Coordinate on shared files
- Regular team sync meetings

### Documentation

- Keep README files updated
- Document breaking changes
- Maintain changelog
- Document development setup

# Git and Commit Rules

## Conventional Commits

### Commit Message Format

- Use conventional commit format: `type(scope): description`
- Keep description under 72 characters
- Use imperative mood ("add" not "added")
- Reference issues when applicable

```bash
# ✅ Good: Conventional commit format
git commit -m "feat(ui): add dark mode toggle component"
git commit -m "fix(auth): resolve login validation issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(store): simplify state management logic"

# ❌ Bad: Non-conventional format
git commit -m "added dark mode"
git commit -m "fixed bug"
git commit -m "updated docs"
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

### Scope Usage

- Use scope to indicate which part of the codebase is affected
- Use lowercase with hyphens for multi-word scopes
- Multiple scopes separated by commas (no trailing comma)
- Keep scopes concise and meaningful

```bash
# ✅ Good: Scoped commits
git commit -m "feat(ui,theme): add dark mode and theme switching"
git commit -m "fix(auth,api): resolve authentication token validation"
git commit -m "refactor(store,components): simplify state management"

# ❌ Bad: Unclear or missing scope
git commit -m "feat: add stuff"
git commit -m "fix: fix things"
```

### Breaking Changes

- Use `!` after the type to indicate a breaking change
- Document breaking changes in the commit body
- Use semantic versioning for releases

```bash
# ✅ Good: Breaking change commit
git commit -m "feat!: change API response format

BREAKING CHANGE: The API now returns data in a new format.
Migration guide: Update all API calls to handle the new response structure."

# ❌ Bad: Breaking change without proper indication
git commit -m "feat: change API format"
```

## Branch Strategy

### Branch Naming

- Use descriptive branch names
- Follow pattern: `type/description`
- Use lowercase with hyphens
- Keep names concise but descriptive

```bash
# ✅ Good: Descriptive branch names
git checkout -b feature/dark-mode-toggle
git checkout -b fix/login-validation
git checkout -b refactor/state-management
git checkout -b docs/update-readme

# ❌ Bad: Unclear branch names
git checkout -b feature
git checkout -b fix
git checkout -b new-stuff
```

### Branch Types

- **feature/**: New features or enhancements
- **fix/**: Bug fixes
- **refactor/**: Code refactoring
- **docs/**: Documentation updates
- **test/**: Test-related changes
- **chore/**: Maintenance tasks

### Branch Management

- Keep branches short-lived
- Delete branches after merging
- Use feature branches for new development
- Maintain clean branch history

## Code Review Process

### Review Standards

- Review for functionality and security
- Check for code quality and standards
- Ensure proper testing coverage
- Verify documentation updates

### Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met

### Review Comments

- Be constructive and specific
- Explain the "why" not just the "what"
- Suggest improvements when possible
- Use positive language

## Pre-commit Hooks

### Hook Configuration

- Use Husky for Git hooks
- Configure pre-commit hooks for code quality
- Set up commit-msg hooks for message validation
- Ensure hooks are executable

```bash
# ✅ Good: Pre-commit hook setup
#!/bin/sh
npm run format
npm run lint
npm run test

# ❌ Bad: No pre-commit checks
# No hooks configured
```

### Hook Best Practices

- Keep hooks fast and efficient
- Provide clear error messages
- Allow bypassing when necessary
- Document hook requirements

## Commit History Management

### Commit Organization

- Make atomic commits
- Group related changes together
- Use meaningful commit messages
- Avoid large, monolithic commits

### Interactive Rebase

- Use interactive rebase for clean history
- Squash related commits
- Reorder commits logically
- Edit commit messages when needed

```bash
# ✅ Good: Interactive rebase
git rebase -i HEAD~3

# Commands:
# pick - use commit
# reword - use commit, but edit the commit message
# edit - use commit, but stop for amending
# squash - use commit, but meld into previous commit
# fixup - like "squash", but discard this commit's log message
```

### Commit Message Editing

- Use `git commit --amend` for last commit
- Use interactive rebase for older commits
- Keep commit messages clear and descriptive
- Reference related issues and PRs

## Merge Strategies

### Merge vs Rebase

- Use rebase for feature branches
- Use merge for main branch integration
- Maintain clean, linear history
- Avoid merge commits in feature branches

```bash
# ✅ Good: Rebase workflow
git checkout feature/new-feature
# ... make changes ...
git commit -m "feat: add new feature"
git rebase main
git checkout main
git merge feature/new-feature

# ❌ Bad: Merge commits in feature branches
git checkout feature/new-feature
git merge main  # Creates unnecessary merge commit
```

### Conflict Resolution

- Resolve conflicts carefully
- Test after conflict resolution
- Communicate with team members
- Document complex resolutions

## Tagging and Releases

### Version Tagging

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases with descriptive messages
- Use annotated tags for releases
- Maintain release notes

```bash
# ✅ Good: Release tagging
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# ❌ Bad: Lightweight tags for releases
git tag v1.2.0
```

### Release Process

- Create release branches for major versions
- Use automated release tools when possible
- Generate changelogs from commit history
- Test releases before publishing

## Git Configuration

### Local Configuration

- Set up proper user information
- Configure default editor
- Set up signing keys for commits
- Configure aliases for common commands

```bash
# ✅ Good: Git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.editor "code --wait"
git config --global commit.gpgsign true

# Useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
```

### Repository Configuration

- Set up proper remote URLs
- Configure branch protection rules
- Set up automated workflows
- Configure issue templates

## Collaboration Guidelines

### Team Workflow

- Use pull requests for code review
- Require approval before merging
- Use draft PRs for work in progress
- Maintain clear communication

### Conflict Prevention

- Communicate changes with team
- Use feature flags for large changes
- Coordinate on shared files
- Regular team sync meetings

### Documentation

- Keep README files updated
- Document breaking changes
- Maintain changelog
- Document development setup
