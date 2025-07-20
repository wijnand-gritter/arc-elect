# Prompt Templates for Arc Elect Development

## 🎯 **Overview**

This directory contains specialized prompt templates designed specifically for the Arc Elect JSON Schema Editor project. These templates leverage the project's tech stack, architecture patterns, and development guidelines to provide targeted assistance.

## 📁 **Template Categories**

### **01_Component-Development.md**

- Creating new React components
- Following shadcn/ui patterns
- Implementing proper TypeScript interfaces
- Adding accessibility features

### **02_State-Management.md**

- Zustand store development
- Cross-module state synchronization
- Persistence and caching strategies
- Performance optimization

### **03_Electron-Integration.md**

- IPC communication patterns
- File system operations
- Security best practices
- Main process development

### **04_Schema-Processing.md**

- JSON Schema validation
- Reference tracking and resolution
- Analytics and complexity metrics
- Performance optimization

### **05_UI-UX-Development.md**

- User interface design
- User experience patterns
- Accessibility implementation
- Responsive design

### **06_Testing-Strategies.md**

- Unit testing with Vitest
- E2E testing with Playwright
- Component testing patterns
- Performance testing

### **07_Performance-Optimization.md**

- React performance optimization
- Bundle size optimization
- Memory management
- Loading strategies

### **08_Error-Handling.md**

- Error boundary implementation
- Logging and monitoring
- User feedback strategies
- Recovery mechanisms

## 🚀 **How to Use These Templates**

### **1. Select the Appropriate Template**

Choose the template that best matches your current development task:

- Building a new component? → `01_Component-Development.md`
- Working on state management? → `02_State-Management.md`
- Implementing Electron features? → `03_Electron-Integration.md`
- Processing JSON schemas? → `04_Schema-Processing.md`

### **2. Customize the Template**

Each template includes placeholders that you should replace with your specific requirements:

- `[COMPONENT_NAME]` - Replace with your component name
- `[FEATURE_DESCRIPTION]` - Describe what you're building
- `[SPECIFIC_REQUIREMENTS]` - Add any specific requirements or constraints

### **3. Provide Context**

Include relevant context about:

- Current implementation state
- Related components or modules
- Performance requirements
- User experience goals

### **4. Reference Project Patterns**

The templates reference established patterns from your codebase:

- File structure and naming conventions
- State management patterns
- Error handling approaches
- Testing strategies

## 🎨 **Template Features**

### **Project-Specific Context**

Each template includes:

- References to your tech stack (Electron, React, TypeScript, etc.)
- Established patterns from DEV_GUIDELINES.md
- File structure and naming conventions
- Security and performance considerations

### **Code Examples**

Templates provide:

- TypeScript interface examples
- Component structure patterns
- State management examples
- Testing patterns

### **Best Practices**

Templates incorporate:

- Electron security best practices
- React performance optimization
- TypeScript strict typing
- Accessibility guidelines

## 📋 **Template Usage Examples**

### **Example 1: Creating a New Component**

```
Use the 01_Component-Development.md template with:
- Component Name: SchemaCard
- Feature Description: Display schema metadata in a card format
- Specific Requirements: Show validation status, reference count, and quick actions
```

### **Example 2: Implementing State Management**

```
Use the 02_State-Management.md template with:
- Feature Description: Schema selection and navigation state
- Specific Requirements: Track selected schema across modules, handle navigation history
```

### **Example 3: File System Integration**

```
Use the 03_Electron-Integration.md template with:
- Feature Description: Schema file loading and watching
- Specific Requirements: Recursive file scanning, change detection, progress tracking
```

## 🔧 **Customization Guidelines**

### **Adding New Templates**

When creating new templates:

1. Follow the established format and structure
2. Include project-specific context and patterns
3. Provide clear examples and code snippets
4. Reference relevant documentation and guidelines

### **Updating Existing Templates**

When updating templates:

1. Maintain backward compatibility
2. Add new patterns and best practices
3. Update code examples to reflect current tech stack
4. Include new security or performance considerations

### **Template Maintenance**

Regular maintenance tasks:

1. Review and update tech stack references
2. Add new patterns and best practices
3. Update code examples for new versions
4. Validate against current project structure

## 🎯 **Success Metrics**

### **Template Effectiveness**

- **Reduced Development Time**: Templates should speed up development
- **Consistent Quality**: Output should follow project standards
- **Reduced Errors**: Templates should prevent common mistakes
- **Better Documentation**: Output should be well-documented

### **Template Usage**

- **Adoption Rate**: How often templates are used
- **User Satisfaction**: Feedback on template usefulness
- **Output Quality**: Quality of generated code and solutions
- **Maintenance Overhead**: Effort required to maintain templates

## 📚 **Additional Resources**

### **Project Documentation**

- `DEV_GUIDELINES.md` - Core development guidelines
- `docs/` - Detailed component and module documentation
- `src/` - Source code examples and patterns

### **External Resources**

- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

These prompt templates are designed to accelerate your development while maintaining high quality and consistency with your project's architecture and patterns.
