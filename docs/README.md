# Arc Elect Documentation

> **v1.0.0** - Auto-generated from JSDoc comments

## 📖 Overview

This directory contains the auto-generated TypeDoc documentation for the Arc Elect project. The documentation is generated from JSDoc comments in the source code and provides comprehensive API documentation for all components, functions, and types.

## 🚀 How to Use

### Viewing Documentation

1. **Main Documentation**: Start with `README.md` (this file) for the complete overview
2. **Module Index**: See `modules.md` for a list of all documented modules
3. **Individual Modules**: Each module has its own directory with detailed documentation

### Navigation

- **README.md** - Complete project documentation and guidelines
- **modules.md** - Index of all modules and components
- **Module directories** - Detailed documentation for each file/module
  - `main/` - Main process files
  - `renderer/` - Renderer process files
  - `components/` - React components
  - `pages/` - Page components
  - `stores/` - State management
  - `lib/` - Utility functions
  - `hooks/` - Custom React hooks
  - `types/` - TypeScript definitions

## 🔧 How to Regenerate

To regenerate the documentation after making changes to the code:

```bash
# Clean previous documentation
npm run docs:clean

# Generate new documentation
npm run docs
```

Or use TypeDoc directly:

```bash
npx typedoc
```

## 📋 Features

- **Markdown Format**: Easy to read and version control friendly
- **Complete Coverage**: All important files and functions documented
- **Type Information**: Full TypeScript type definitions
- **Code Examples**: Usage examples from JSDoc comments
- **Module Organization**: Clear structure by file/module
- **Cross-references**: Links between related documentation

## 🛠️ Configuration

The documentation is generated using the `typedoc.json` configuration file with:

- **Theme**: Markdown (instead of HTML)
- **Plugin**: typedoc-plugin-markdown
- **Entry Points**: All important source files
- **Exclusions**: Test files, build artifacts, etc.
- **Integration**: DEV_GUIDELINES.md as main README

## 📝 Contributing

To improve the documentation:

1. Add JSDoc comments to your code following the TypeScript standard
2. Include examples and usage information
3. Use proper parameter and return type annotations
4. Regenerate the documentation after changes

## 🔗 Links

- [TypeDoc Documentation](https://typedoc.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [TypeScript JSDoc Support](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

---

**Arc Elect Documentation v1.0.0**
