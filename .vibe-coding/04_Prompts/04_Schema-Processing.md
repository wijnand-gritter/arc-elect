# Schema Processing Template

## 🎯 **Template Purpose**

Implement JSON Schema processing, dependency management, reference tracking, and circular reference detection for the Arc Elect JSON Schema Editor.

## 📋 **Template Usage**

Replace the placeholders below with your specific requirements:

- `[PROCESSING_TASK]` - The specific processing task (validation, reference resolution, etc.)
- `[SCHEMA_COMPLEXITY]` - Description of schema complexity and requirements
- `[SPECIFIC_REQUIREMENTS]` - Any specific requirements or constraints

## 🚀 **Prompt Template**

````
I need to implement schema processing for the Arc Elect JSON Schema Editor project.

**Processing Task:**
- Task: [PROCESSING_TASK]
- Schema Complexity: [SCHEMA_COMPLEXITY]
- Specific Requirements: [SPECIFIC_REQUIREMENTS]

**Project Context:**
- Tech Stack: Electron 37.2.3, React 19.1.0, TypeScript 5.8.3
- Schema Processing: JSON Schema validation, reference resolution, dependency tracking
- Performance: Handle large schema collections efficiently
- Patterns: Follow established dependency management patterns

**Dependency Management Pattern:**
```typescript
// Schema dependency structuur
interface Schema {
  id: string;
  projectId: string;
  references: string[]; // Schema IDs die dit schema referencet
  referencedBy: string[]; // Schema IDs die dit schema referencen
  dependencyGraph: DependencyNode;
}

interface DependencyNode {
  schemaId: string;
  dependencies: string[]; // Directe dependencies
  dependents: string[]; // Wie afhankelijk is van dit schema
  depth: number; // Dependency depth
  isCircular: boolean; // Circular reference flag
}

// Dependency graph voor het hele project
interface DependencyGraph {
  nodes: Record<string, DependencyNode>;
  circularReferences: CircularReference[];
  orphanSchemas: string[]; // Schemas zonder dependencies
  rootSchemas: string[]; // Schemas die niemand referencet
}
````

**Requirements:**

1. Implement efficient dependency tracking and resolution
2. Detect and handle circular references gracefully
3. Build dependency graph for visualization and analysis
4. Optimize performance for large schema collections
5. Provide real-time dependency updates
6. Include proper error handling and validation
7. Support cross-project references when needed
8. Implement caching for performance optimization
9. Add dependency analysis and reporting
10. Follow the project's error handling patterns

**Additional Context:**

- Schemas can reference other schemas within the same project
- Need to handle both local and remote references
- Performance is critical for projects with 100+ schemas
- Circular references should be detected and reported, not blocked
- Dependency changes should trigger real-time updates

Please provide:

1. Complete dependency management implementation
2. Circular reference detection algorithm
3. Dependency graph building and visualization
4. Performance optimization strategies
5. Error handling and validation
6. Testing considerations and examples

````

## 🏗️ **Dependency Management Architecture**

### **Core Dependency Interfaces**

```typescript
// Schema met uitgebreide dependency informatie
interface Schema {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content: any;

  // Dependency tracking
  references: string[]; // Schema IDs die dit schema referencet
  referencedBy: string[]; // Schema IDs die dit schema referencen
  dependencyGraph: DependencyNode;

  // Metadata
  metadata: SchemaMetadata;
  validationStatus: ValidationStatus;
  lastDependencyScan: Date;
}

// Dependency node voor graph analysis
interface DependencyNode {
  schemaId: string;
  dependencies: string[]; // Directe dependencies
  dependents: string[]; // Wie afhankelijk is van dit schema
  depth: number; // Dependency depth (0 = root, 1 = direct dependency, etc.)
  isCircular: boolean; // Circular reference flag
  circularPath?: string[]; // Path van circular reference
  complexity: number; // Dependency complexity score
}

// Dependency graph voor project-wide analysis
interface DependencyGraph {
  nodes: Record<string, DependencyNode>;
  circularReferences: CircularReference[];
  orphanSchemas: string[]; // Schemas zonder dependencies
  rootSchemas: string[]; // Schemas die niemand referencet
  maxDepth: number;
  totalDependencies: number;
  lastUpdated: Date;
}

// Circular reference detection
interface CircularReference {
  schemas: string[]; // Schemas in de circular reference
  path: string[]; // Exacte path van de circular reference
  severity: 'low' | 'medium' | 'high';
  impact: string[]; // Welke schemas worden beïnvloed
  resolution?: string; // Mogelijke oplossing
}
````

### **Reference Resolution Engine**

```typescript
// Reference resolution service
class SchemaReferenceResolver {
  private projectId: string;
  private schemas: Record<string, Schema>;
  private dependencyGraph: DependencyGraph;

  constructor(projectId: string, schemas: Record<string, Schema>) {
    this.projectId = projectId;
    this.schemas = schemas;
    this.dependencyGraph = this.buildDependencyGraph();
  }

  // Resolve alle references in een schema
  resolveSchemaReferences(schemaId: string): ReferenceResolutionResult {
    const schema = this.schemas[schemaId];
    if (!schema) {
      throw new Error(`Schema ${schemaId} not found`);
    }

    const references = this.extractReferences(schema.content);
    const resolvedReferences = this.resolveReferencePaths(references, schema.path);

    return {
      schemaId,
      references: resolvedReferences,
      unresolvedReferences: references.filter((ref) => !resolvedReferences.includes(ref)),
      circularReferences: this.detectCircularReferences(schemaId, resolvedReferences),
    };
  }

  // Extract $ref statements uit schema content
  private extractReferences(content: any): string[] {
    const references: string[] = [];

    const extractRefs = (obj: any, path: string[] = []) => {
      if (typeof obj !== 'object' || obj === null) return;

      if (obj.$ref && typeof obj.$ref === 'string') {
        references.push(obj.$ref);
      }

      for (const [key, value] of Object.entries(obj)) {
        extractRefs(value, [...path, key]);
      }
    };

    extractRefs(content);
    return references;
  }

  // Resolve reference paths naar schema IDs
  private resolveReferencePaths(references: string[], basePath: string): string[] {
    return references
      .map((ref) => this.resolveReferencePath(ref, basePath))
      .filter(Boolean) as string[];
  }

  // Resolve een enkele reference path
  private resolveReferencePath(ref: string, basePath: string): string | null {
    // Handle verschillende reference types
    if (ref.startsWith('#')) {
      // Internal reference - resolve binnen hetzelfde schema
      return this.resolveInternalReference(ref, basePath);
    } else if (ref.startsWith('./') || ref.startsWith('../')) {
      // Relative file reference
      return this.resolveRelativeReference(ref, basePath);
    } else if (ref.startsWith('http://') || ref.startsWith('https://')) {
      // Remote reference - handle separately
      return this.resolveRemoteReference(ref);
    } else {
      // Absolute file reference
      return this.resolveAbsoluteReference(ref);
    }
  }
}
```

## 🔄 **Circular Reference Detection**

### **Circular Reference Algorithm**

```typescript
// Circular reference detection service
class CircularReferenceDetector {
  private dependencyGraph: DependencyGraph;

  constructor(dependencyGraph: DependencyGraph) {
    this.dependencyGraph = dependencyGraph;
  }

  // Detect alle circular references in het project
  detectAllCircularReferences(): CircularReference[] {
    const circularReferences: CircularReference[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const nodeId of Object.keys(this.dependencyGraph.nodes)) {
      if (!visited.has(nodeId)) {
        const cycles = this.detectCyclesFromNode(nodeId, visited, recursionStack, []);
        circularReferences.push(...cycles);
      }
    }

    return this.analyzeCircularReferences(circularReferences);
  }

  // Detect cycles vanaf een specifieke node
  private detectCyclesFromNode(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
  ): CircularReference[] {
    const cycles: CircularReference[] = [];

    if (recursionStack.has(nodeId)) {
      // Circular reference gevonden
      const cycleStart = currentPath.indexOf(nodeId);
      const cyclePath = currentPath.slice(cycleStart);
      cycles.push({
        schemas: cyclePath,
        path: cyclePath,
        severity: this.calculateSeverity(cyclePath),
        impact: this.calculateImpact(cyclePath),
      });
      return cycles;
    }

    if (visited.has(nodeId)) {
      return cycles;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const node = this.dependencyGraph.nodes[nodeId];
    for (const dependencyId of node.dependencies) {
      const dependencyCycles = this.detectCyclesFromNode(
        dependencyId,
        visited,
        recursionStack,
        currentPath,
      );
      cycles.push(...dependencyCycles);
    }

    recursionStack.delete(nodeId);
    currentPath.pop();

    return cycles;
  }

  // Calculate severity van een circular reference
  private calculateSeverity(cyclePath: string[]): 'low' | 'medium' | 'high' {
    const cycleLength = cyclePath.length;
    const affectedSchemas = this.countAffectedSchemas(cyclePath);

    if (cycleLength <= 2 && affectedSchemas <= 3) return 'low';
    if (cycleLength <= 4 && affectedSchemas <= 10) return 'medium';
    return 'high';
  }

  // Calculate impact van een circular reference
  private calculateImpact(cyclePath: string[]): string[] {
    const impact = new Set<string>();

    // Add schemas in de cycle
    cyclePath.forEach((schemaId) => impact.add(schemaId));

    // Add schemas die afhankelijk zijn van schemas in de cycle
    for (const schemaId of cyclePath) {
      const dependents = this.getDependents(schemaId);
      dependents.forEach((dependentId) => impact.add(dependentId));
    }

    return Array.from(impact);
  }

  // Get alle schemas die afhankelijk zijn van een schema
  private getDependents(schemaId: string): string[] {
    const dependents = new Set<string>();
    const queue = [schemaId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.dependencyGraph.nodes[currentId];

      for (const dependentId of node.dependents) {
        if (!dependents.has(dependentId)) {
          dependents.add(dependentId);
          queue.push(dependentId);
        }
      }
    }

    return Array.from(dependents);
  }
}
```

## 📊 **Dependency Graph Building**

### **Graph Construction**

```typescript
// Dependency graph builder
class DependencyGraphBuilder {
  private schemas: Record<string, Schema>;
  private resolver: SchemaReferenceResolver;

  constructor(schemas: Record<string, Schema>) {
    this.schemas = schemas;
    this.resolver = new SchemaReferenceResolver(schemas);
  }

  // Build complete dependency graph
  buildDependencyGraph(): DependencyGraph {
    const nodes: Record<string, DependencyNode> = {};
    const circularReferences: CircularReference[] = [];

    // Initialize nodes
    for (const [schemaId, schema] of Object.entries(this.schemas)) {
      nodes[schemaId] = {
        schemaId,
        dependencies: [],
        dependents: [],
        depth: 0,
        isCircular: false,
        complexity: 0,
      };
    }

    // Build dependency relationships
    for (const [schemaId, schema] of Object.entries(this.schemas)) {
      const resolution = this.resolver.resolveSchemaReferences(schemaId);

      // Update dependencies
      nodes[schemaId].dependencies = resolution.references;

      // Update dependents
      for (const refId of resolution.references) {
        if (nodes[refId]) {
          nodes[refId].dependents.push(schemaId);
        }
      }
    }

    // Calculate depths and detect circular references
    this.calculateDepths(nodes);
    const detector = new CircularReferenceDetector({ nodes, circularReferences: [] });
    const detectedCircularReferences = detector.detectAllCircularReferences();

    // Mark circular nodes
    for (const circularRef of detectedCircularReferences) {
      for (const schemaId of circularRef.schemas) {
        if (nodes[schemaId]) {
          nodes[schemaId].isCircular = true;
          nodes[schemaId].circularPath = circularRef.path;
        }
      }
    }

    // Calculate complexity scores
    this.calculateComplexityScores(nodes);

    return {
      nodes,
      circularReferences: detectedCircularReferences,
      orphanSchemas: this.findOrphanSchemas(nodes),
      rootSchemas: this.findRootSchemas(nodes),
      maxDepth: Math.max(...Object.values(nodes).map((n) => n.depth)),
      totalDependencies: Object.values(nodes).reduce((sum, n) => sum + n.dependencies.length, 0),
      lastUpdated: new Date(),
    };
  }

  // Calculate dependency depths
  private calculateDepths(nodes: Record<string, DependencyNode>): void {
    const visited = new Set<string>();

    for (const nodeId of Object.keys(nodes)) {
      if (!visited.has(nodeId)) {
        this.calculateDepthFromNode(nodeId, nodes, visited, new Set<string>(), 0);
      }
    }
  }

  // Calculate depth vanaf een node (met cycle detection)
  private calculateDepthFromNode(
    nodeId: string,
    nodes: Record<string, DependencyNode>,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentDepth: number,
  ): number {
    if (recursionStack.has(nodeId)) {
      // Circular reference - return current depth
      return currentDepth;
    }

    if (visited.has(nodeId)) {
      return nodes[nodeId].depth;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    let maxDepth = currentDepth;
    const node = nodes[nodeId];

    for (const dependencyId of node.dependencies) {
      if (nodes[dependencyId]) {
        const dependencyDepth = this.calculateDepthFromNode(
          dependencyId,
          nodes,
          visited,
          recursionStack,
          currentDepth + 1,
        );
        maxDepth = Math.max(maxDepth, dependencyDepth);
      }
    }

    node.depth = maxDepth;
    recursionStack.delete(nodeId);

    return maxDepth;
  }

  // Find orphan schemas (geen dependencies, geen dependents)
  private findOrphanSchemas(nodes: Record<string, DependencyNode>): string[] {
    return Object.entries(nodes)
      .filter(([_, node]) => node.dependencies.length === 0 && node.dependents.length === 0)
      .map(([schemaId, _]) => schemaId);
  }

  // Find root schemas (geen dependents)
  private findRootSchemas(nodes: Record<string, DependencyNode>): string[] {
    return Object.entries(nodes)
      .filter(([_, node]) => node.dependents.length === 0)
      .map(([schemaId, _]) => schemaId);
  }

  // Calculate complexity scores
  private calculateComplexityScores(nodes: Record<string, DependencyNode>): void {
    for (const node of Object.values(nodes)) {
      node.complexity = this.calculateNodeComplexity(node, nodes);
    }
  }

  // Calculate complexity voor een node
  private calculateNodeComplexity(
    node: DependencyNode,
    nodes: Record<string, DependencyNode>,
  ): number {
    let complexity = 0;

    // Base complexity
    complexity += node.dependencies.length * 2;
    complexity += node.dependents.length;

    // Depth penalty
    complexity += node.depth * 3;

    // Circular reference penalty
    if (node.isCircular) {
      complexity += 10;
    }

    // Recursive dependency complexity
    for (const dependencyId of node.dependencies) {
      const dependency = nodes[dependencyId];
      if (dependency) {
        complexity += dependency.complexity * 0.5;
      }
    }

    return Math.round(complexity);
  }
}
```

## 🔄 **Real-time Dependency Updates**

### **Dependency Change Tracking**

```typescript
// Dependency change tracker
class DependencyChangeTracker {
  private previousGraph: DependencyGraph;
  private currentGraph: DependencyGraph;
  private changeListeners: Set<DependencyChangeListener>;

  constructor() {
    this.changeListeners = new Set();
  }

  // Update dependency graph en notify listeners
  updateDependencyGraph(newGraph: DependencyGraph): DependencyChanges {
    this.previousGraph = this.currentGraph;
    this.currentGraph = newGraph;

    const changes = this.detectChanges();
    this.notifyListeners(changes);

    return changes;
  }

  // Detect changes tussen oude en nieuwe graph
  private detectChanges(): DependencyChanges {
    if (!this.previousGraph) {
      return {
        type: 'initial',
        addedSchemas: Object.keys(this.currentGraph.nodes),
        removedSchemas: [],
        modifiedDependencies: [],
        newCircularReferences: this.currentGraph.circularReferences,
        resolvedCircularReferences: [],
      };
    }

    const changes: DependencyChanges = {
      type: 'update',
      addedSchemas: [],
      removedSchemas: [],
      modifiedDependencies: [],
      newCircularReferences: [],
      resolvedCircularReferences: [],
    };

    // Detect added/removed schemas
    const previousSchemaIds = new Set(Object.keys(this.previousGraph.nodes));
    const currentSchemaIds = new Set(Object.keys(this.currentGraph.nodes));

    for (const schemaId of currentSchemaIds) {
      if (!previousSchemaIds.has(schemaId)) {
        changes.addedSchemas.push(schemaId);
      }
    }

    for (const schemaId of previousSchemaIds) {
      if (!currentSchemaIds.has(schemaId)) {
        changes.removedSchemas.push(schemaId);
      }
    }

    // Detect modified dependencies
    for (const [schemaId, currentNode] of Object.entries(this.currentGraph.nodes)) {
      const previousNode = this.previousGraph.nodes[schemaId];
      if (previousNode) {
        const dependenciesChanged = !this.arraysEqual(
          currentNode.dependencies,
          previousNode.dependencies,
        );

        if (dependenciesChanged) {
          changes.modifiedDependencies.push({
            schemaId,
            previousDependencies: previousNode.dependencies,
            currentDependencies: currentNode.dependencies,
          });
        }
      }
    }

    // Detect circular reference changes
    const previousCircularRefs = new Set(
      this.previousGraph.circularReferences.map((ref) => ref.schemas.join('->')),
    );
    const currentCircularRefs = new Set(
      this.currentGraph.circularReferences.map((ref) => ref.schemas.join('->')),
    );

    for (const circularRef of this.currentGraph.circularReferences) {
      const refKey = circularRef.schemas.join('->');
      if (!previousCircularRefs.has(refKey)) {
        changes.newCircularReferences.push(circularRef);
      }
    }

    for (const circularRef of this.previousGraph.circularReferences) {
      const refKey = circularRef.schemas.join('->');
      if (!currentCircularRefs.has(refKey)) {
        changes.resolvedCircularReferences.push(circularRef);
      }
    }

    return changes;
  }

  // Helper om arrays te vergelijken
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  }

  // Subscribe to dependency changes
  subscribe(listener: DependencyChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(changes: DependencyChanges): void {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        logger.error('Error in dependency change listener', { error, changes });
      }
    }
  }
}

// Types voor dependency changes
interface DependencyChanges {
  type: 'initial' | 'update';
  addedSchemas: string[];
  removedSchemas: string[];
  modifiedDependencies: ModifiedDependency[];
  newCircularReferences: CircularReference[];
  resolvedCircularReferences: CircularReference[];
}

interface ModifiedDependency {
  schemaId: string;
  previousDependencies: string[];
  currentDependencies: string[];
}

type DependencyChangeListener = (changes: DependencyChanges) => void;
```

## 📊 **Performance Optimization**

### **Caching en Lazy Loading**

```typescript
// Dependency cache voor performance
class DependencyCache {
  private cache = new Map<string, CachedDependencyData>();
  private maxCacheSize = 1000;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Get cached dependency data
  get(schemaId: string): CachedDependencyData | null {
    const cached = this.cache.get(schemaId);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(schemaId);
      return null;
    }

    return cached;
  }

  // Set cached dependency data
  set(schemaId: string, data: Omit<CachedDependencyData, 'timestamp'>): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(schemaId, {
      ...data,
      timestamp: Date.now(),
    });
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
  }

  // Invalidate specific schema
  invalidate(schemaId: string): void {
    this.cache.delete(schemaId);
  }
}

interface CachedDependencyData {
  references: string[];
  dependents: string[];
  depth: number;
  complexity: number;
  timestamp: number;
}
```

## 🧪 **Testing Strategies**

### **Dependency Testing**

```typescript
// Test utilities voor dependency management
describe('Dependency Management', () => {
  let dependencyGraphBuilder: DependencyGraphBuilder;
  let circularReferenceDetector: CircularReferenceDetector;

  beforeEach(() => {
    const mockSchemas = createMockSchemas();
    dependencyGraphBuilder = new DependencyGraphBuilder(mockSchemas);
    const graph = dependencyGraphBuilder.buildDependencyGraph();
    circularReferenceDetector = new CircularReferenceDetector(graph);
  });

  it('should detect circular references correctly', () => {
    const circularRefs = circularReferenceDetector.detectAllCircularReferences();

    expect(circularRefs).toHaveLength(1);
    expect(circularRefs[0].schemas).toEqual(['schema1', 'schema2', 'schema1']);
    expect(circularRefs[0].severity).toBe('medium');
  });

  it('should calculate dependency depths correctly', () => {
    const graph = dependencyGraphBuilder.buildDependencyGraph();

    expect(graph.nodes['schema1'].depth).toBe(0);
    expect(graph.nodes['schema2'].depth).toBe(1);
    expect(graph.nodes['schema3'].depth).toBe(2);
  });

  it('should handle large schema collections efficiently', () => {
    const largeSchemas = createLargeSchemaCollection(1000);
    const startTime = Date.now();

    const graph = dependencyGraphBuilder.buildDependencyGraph();

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});

// Mock data generators
function createMockSchemas(): Record<string, Schema> {
  return {
    schema1: {
      id: 'schema1',
      projectId: 'project1',
      content: { $ref: './schema2.json' },
      references: ['schema2'],
      referencedBy: ['schema2'],
      // ... other properties
    },
    schema2: {
      id: 'schema2',
      projectId: 'project1',
      content: { $ref: './schema1.json' },
      references: ['schema1'],
      referencedBy: ['schema1'],
      // ... other properties
    },
  };
}
```

## 📚 **Additional Resources**

### **Project Documentation**

- `src/renderer/lib/schema-processing/` - Schema processing utilities
- `DEV_GUIDELINES.md` - Performance and error handling patterns
- `src/renderer/stores/useAppStore.ts` - State management integration

### **External Resources**

- [JSON Schema Reference Resolution](https://json-schema.org/understanding-json-schema/structuring.html)
- [Graph Theory for Dependencies](https://en.wikipedia.org/wiki/Dependency_graph)
- [Circular Reference Detection](https://en.wikipedia.org/wiki/Circular_reference)
- [Performance Optimization](https://react.dev/learn/render-and-commit)

This template ensures your schema processing handles dependencies efficiently while detecting and managing circular references gracefully.
