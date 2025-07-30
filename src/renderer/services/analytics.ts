/**
 * Analytics Service
 *
 * Provides comprehensive analysis of JSON schemas including circular reference
 * detection, complexity metrics, and reference graph analysis.
 *
 * @module analytics-service
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import type { Schema } from '../../types/schema-editor';
import logger from '../lib/renderer-logger';

/**
 * Circular reference information.
 */
export interface CircularReference {
  /** Path of schemas involved in the circular reference */
  path: string[];
  /** Depth of the circular reference */
  depth: number;
  /** Type of circular reference */
  type: 'direct' | 'indirect';
  /** Severity of the circular reference */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Schema complexity metrics.
 */
export interface ComplexityMetrics {
  /** Total number of properties */
  propertyCount: number;
  /** Maximum nesting depth */
  maxDepth: number;
  /** Number of required properties */
  requiredProperties: number;
  /** Number of optional properties */
  optionalProperties: number;
  /** Number of references to other schemas */
  referenceCount: number;
  /** Complexity score (0-100) */
  complexityScore: number;
  /** Size of schema in bytes */
  sizeBytes: number;
}

/**
 * Reference graph node.
 */
export interface ReferenceNode {
  /** Schema ID */
  id: string;
  /** Schema name */
  name: string;
  /** Number of incoming references */
  inDegree: number;
  /** Number of outgoing references */
  outDegree: number;
  /** Centrality score in the reference graph */
  centrality: number;
}

/**
 * Reference graph edge.
 */
export interface ReferenceEdge {
  /** Source schema ID */
  source: string;
  /** Target schema ID */
  target: string;
  /** Reference path */
  path: string;
  /** Reference type */
  type: 'direct' | 'nested';
}

/**
 * Reference graph structure.
 */
export interface ReferenceGraph {
  /** Graph nodes (schemas) */
  nodes: ReferenceNode[];
  /** Graph edges (references) */
  edges: ReferenceEdge[];
  /** Graph metrics */
  metrics: {
    /** Total number of nodes */
    nodeCount: number;
    /** Total number of edges */
    edgeCount: number;
    /** Graph density (0-1) */
    density: number;
    /** Average degree */
    averageDegree: number;
    /** Number of connected components */
    connectedComponents: number;
  };
}

/**
 * Comprehensive analytics results.
 */
export interface AnalyticsResult {
  /** Circular references found */
  circularReferences: CircularReference[];
  /** Complexity metrics for each schema */
  complexityMetrics: Map<string, ComplexityMetrics>;
  /** Reference graph analysis */
  referenceGraph: ReferenceGraph;
  /** Overall project metrics */
  projectMetrics: {
    /** Total number of schemas */
    totalSchemas: number;
    /** Average complexity score */
    averageComplexity: number;
    /** Most complex schema */
    mostComplexSchema: string;
    /** Most referenced schema */
    mostReferencedSchema: string;
    /** Schemas with no references */
    orphanedSchemas: string[];
    /** Schemas with circular references */
    circularSchemas: string[];
  };
  /** Performance metrics */
  performance: {
    /** Analysis duration in milliseconds */
    duration: number;
    /** Memory usage estimate */
    memoryUsage: number;
    /** Timestamp of analysis */
    timestamp: Date;
  };
}

/**
 * Analytics service class.
 */
export class AnalyticsService {
  private cache = new Map<string, AnalyticsResult>();
  private isAnalyzing = false;

  /**
   * Analyzes a collection of schemas and returns comprehensive analytics.
   */
  async analyzeSchemas(schemas: Schema[]): Promise<AnalyticsResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(schemas);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      logger.debug('Analytics: Using cached result', { cacheKey });
      return this.cache.get(cacheKey)!;
    }

    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    this.isAnalyzing = true;

    try {
      logger.info('Analytics: Starting schema analysis', { schemaCount: schemas.length });

      // Perform analysis
      const circularReferences = this.detectCircularReferences(schemas);
      const complexityMetrics = this.calculateComplexityMetrics(schemas);
      const referenceGraph = this.buildReferenceGraph(schemas);
      const projectMetrics = this.calculateProjectMetrics(
        schemas,
        complexityMetrics,
        circularReferences,
      );

      const duration = Date.now() - startTime;
      const result: AnalyticsResult = {
        circularReferences,
        complexityMetrics,
        referenceGraph,
        projectMetrics,
        performance: {
          duration,
          memoryUsage: this.estimateMemoryUsage(schemas),
          timestamp: new Date(),
        },
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      logger.info('Analytics: Analysis completed', {
        duration,
        circularReferences: circularReferences.length,
        totalSchemas: schemas.length,
      });

      return result;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Detects circular references in the schema collection.
   * Uses DFS with deduplication to avoid counting the same cycle multiple times.
   */
  public detectCircularReferences(schemas: Schema[]): CircularReference[] {
    const circularRefs: CircularReference[] = [];
    const schemaMap = new Map(schemas.map((s) => [s.id, s]));
    const globalVisited = new Set<string>();
    const detectedCycles = new Set<string>(); // Track unique cycles

    logger.debug('Starting circular reference detection', {
      schemaCount: schemas.length,
      schemaIds: schemas.map((s) => s.id),
      totalReferences: schemas.reduce((sum, s) => sum + s.references.length, 0),
    });

    const dfs = (
      schemaId: string,
      path: string[],
      visited: Set<string>,
      recursionStack: Set<string>,
    ): void => {
      if (recursionStack.has(schemaId)) {
        // Found circular reference
        const circularPath = [...path, schemaId];
        const startIndex = circularPath.indexOf(schemaId);
        const circularSegment = circularPath.slice(startIndex);

        // Create a normalized cycle key for deduplication
        // Sort the cycle to ensure A->B->A is the same as B->A->B
        const normalizedCycle = [...circularSegment];
        normalizedCycle.pop(); // Remove the duplicate at the end

        // Find the lexicographically smallest ID to use as the starting point
        const minId = normalizedCycle.reduce((min, current) => (current < min ? current : min));
        const minIndex = normalizedCycle.indexOf(minId);
        const rotatedCycle = [
          ...normalizedCycle.slice(minIndex),
          ...normalizedCycle.slice(0, minIndex),
        ];
        const cycleKey = rotatedCycle.join('->');

        if (!detectedCycles.has(cycleKey)) {
          detectedCycles.add(cycleKey);

          // Convert schema IDs to user-friendly names for display
          const schemaNames = circularSegment.map((id) => {
            const schema = schemaMap.get(id);
            return schema ? schema.name : id;
          });

          logger.debug('Found unique circular reference', {
            path: circularSegment,
            schemaNames,
            depth: circularSegment.length - 1,
            cycleKey,
          });

          circularRefs.push({
            path: schemaNames, // Use schema names instead of IDs
            depth: circularSegment.length - 1,
            type: circularSegment.length === 2 ? 'direct' : 'indirect',
            severity: this.calculateCircularSeverity(circularSegment.length),
          });
        }
        return;
      }

      if (visited.has(schemaId)) {
        return;
      }

      visited.add(schemaId);
      recursionStack.add(schemaId);

      const schema = schemaMap.get(schemaId);
      if (schema) {
        logger.debug('Processing schema references', {
          schemaId,
          schemaName: schema.name,
          referencesCount: schema.references.length,
          references: schema.references.map((r) => r.schemaName),
        });

        for (const ref of schema.references) {
          const referencedSchema = schemas.find((s) => s.name === ref.schemaName);
          if (referencedSchema) {
            dfs(referencedSchema.id, [...path, schemaId], visited, recursionStack);
          } else {
            logger.debug('Referenced schema not found', {
              referenceName: ref.schemaName,
              availableSchemas: schemas.map((s) => s.name),
            });
          }
        }
      }

      recursionStack.delete(schemaId);
    };

    // Check each schema for circular references using fresh visited sets
    for (const schema of schemas) {
      if (!globalVisited.has(schema.id)) {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        dfs(schema.id, [], visited, recursionStack);

        // Add all visited nodes to global visited to avoid redundant checks
        visited.forEach((id) => globalVisited.add(id));
      }
    }

    logger.info('Circular reference detection completed', {
      foundReferences: circularRefs.length,
      uniqueCycles: detectedCycles.size,
      detectedCycleKeys: Array.from(detectedCycles),
    });

    return circularRefs;
  }

  /**
   * Calculates complexity metrics for each schema.
   */
  public calculateComplexityMetrics(schemas: Schema[]): Map<string, ComplexityMetrics> {
    const metrics = new Map<string, ComplexityMetrics>();

    for (const schema of schemas) {
      const complexity = this.analyzeSchemaComplexity(schema);
      metrics.set(schema.id, complexity);
    }

    return metrics;
  }

  /**
   * Analyzes the complexity of a single schema.
   */
  private analyzeSchemaComplexity(schema: Schema): ComplexityMetrics {
    const content = schema.content;
    const contentStr = JSON.stringify(content);

    const propertyCount = this.countProperties(content);
    const maxDepth = this.calculateMaxDepth(content);
    const requiredProperties = this.countRequiredProperties(content);
    const optionalProperties = propertyCount - requiredProperties;
    const referenceCount = schema.references.length;
    const sizeBytes = new Blob([contentStr]).size;

    // Calculate complexity score (0-100)
    const complexityScore = Math.min(
      100,
      Math.round(
        propertyCount * 0.3 + maxDepth * 5 + referenceCount * 2 + (sizeBytes / 1000) * 0.1,
      ),
    );

    return {
      propertyCount,
      maxDepth,
      requiredProperties,
      optionalProperties,
      referenceCount,
      complexityScore,
      sizeBytes,
    };
  }

  /**
   * Builds a reference graph from the schema collection.
   */
  public buildReferenceGraph(schemas: Schema[]): ReferenceGraph {
    const nodes: ReferenceNode[] = [];
    const edges: ReferenceEdge[] = [];
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();

    // Initialize degree maps
    for (const schema of schemas) {
      inDegreeMap.set(schema.id, 0);
      outDegreeMap.set(schema.id, schema.references.length);
    }

    // Build edges and calculate in-degrees
    for (const schema of schemas) {
      for (const ref of schema.references) {
        const targetSchema = schemas.find((s) => s.name === ref.schemaName);
        if (targetSchema) {
          edges.push({
            source: schema.id,
            target: targetSchema.id,
            path: ref.$ref,
            type: ref.$ref.startsWith('#/') ? 'nested' : 'direct',
          });

          inDegreeMap.set(targetSchema.id, (inDegreeMap.get(targetSchema.id) || 0) + 1);
        }
      }
    }

    // Build nodes with centrality scores
    for (const schema of schemas) {
      const inDegree = inDegreeMap.get(schema.id) || 0;
      const outDegree = outDegreeMap.get(schema.id) || 0;
      const centrality = this.calculateCentrality(schema.id, schemas, edges);

      nodes.push({
        id: schema.id,
        name: schema.name,
        inDegree,
        outDegree,
        centrality,
      });
    }

    // Calculate graph metrics
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    const averageDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
    const connectedComponents = this.countConnectedComponents(nodes, edges);

    return {
      nodes,
      edges,
      metrics: {
        nodeCount,
        edgeCount,
        density,
        averageDegree,
        connectedComponents,
      },
    };
  }

  /**
   * Calculates project-level metrics.
   */
  public calculateProjectMetrics(
    schemas: Schema[],
    complexityMetrics: Map<string, ComplexityMetrics>,
    circularReferences: CircularReference[],
  ): AnalyticsResult['projectMetrics'] {
    const totalSchemas = schemas.length;

    // Calculate average complexity
    const complexityScores = Array.from(complexityMetrics.values()).map((m) => m.complexityScore);
    const averageComplexity =
      complexityScores.length > 0
        ? complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length
        : 0;

    // Find most complex schema
    let mostComplexSchema = '';
    let maxComplexity = 0;
    for (const [schemaId, metrics] of complexityMetrics) {
      if (metrics.complexityScore > maxComplexity) {
        maxComplexity = metrics.complexityScore;
        mostComplexSchema = schemas.find((s) => s.id === schemaId)?.name || '';
      }
    }

    // Find most referenced schema
    const referenceCounts = new Map<string, number>();
    for (const schema of schemas) {
      for (const ref of schema.references) {
        const targetSchema = schemas.find((s) => s.name === ref.schemaName);
        if (targetSchema) {
          referenceCounts.set(targetSchema.name, (referenceCounts.get(targetSchema.name) || 0) + 1);
        }
      }
    }

    let mostReferencedSchema = '';
    let maxReferences = 0;
    for (const [schemaName, count] of referenceCounts) {
      if (count > maxReferences) {
        maxReferences = count;
        mostReferencedSchema = schemaName;
      }
    }

    // Find orphaned schemas (no incoming or outgoing references)
    const orphanedSchemas = schemas
      .filter(
        (schema) =>
          schema.references.length === 0 &&
          !schemas.some((s) => s.references.some((ref) => ref.schemaName === schema.name)),
      )
      .map((schema) => schema.name);

    // Find schemas involved in circular references
    const circularSchemas = Array.from(new Set(circularReferences.flatMap((cr) => cr.path))).filter(
      Boolean,
    ); // Path now contains schema names directly

    return {
      totalSchemas,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      mostComplexSchema,
      mostReferencedSchema,
      orphanedSchemas,
      circularSchemas,
    };
  }

  // Helper methods

  private generateCacheKey(schemas: Schema[]): string {
    const ids = schemas
      .map((s) => s.id)
      .sort()
      .join(',');
    const lastModified = Math.max(...schemas.map((s) => s.metadata.lastModified?.getTime() || 0));
    return `${ids}-${lastModified}`;
  }

  private calculateCircularSeverity(depth: number): 'low' | 'medium' | 'high' {
    if (depth <= 2) return 'low';
    if (depth <= 4) return 'medium';
    return 'high';
  }

  private countProperties(obj: unknown, visited = new Set()): number {
    if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
      return 0;
    }

    const objRecord = obj as Record<string, unknown>;
    visited.add(obj);
    let count = 0;

    if (objRecord.properties && typeof objRecord.properties === 'object') {
      for (const prop of Object.values(objRecord.properties as Record<string, unknown>)) {
        count += this.countProperties(prop, visited);
      }
    }

    if (objRecord.items) {
      count += this.countProperties(objRecord.items, visited);
    }

    if (objRecord.additionalProperties && typeof objRecord.additionalProperties === 'object') {
      count += this.countProperties(objRecord.additionalProperties, visited);
    }

    return count;
  }

  private calculateMaxDepth(obj: unknown, currentDepth = 0, visited = new Set()): number {
    if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
      return currentDepth;
    }

    const objRecord = obj as Record<string, unknown>;
    visited.add(obj);
    let maxDepth = currentDepth;

    if (objRecord.properties && typeof objRecord.properties === 'object') {
      for (const prop of Object.values(objRecord.properties as Record<string, unknown>)) {
        maxDepth = Math.max(maxDepth, this.calculateMaxDepth(prop, currentDepth + 1, visited));
      }
    }

    if (objRecord.items) {
      maxDepth = Math.max(maxDepth, this.calculateMaxDepth(objRecord.items, currentDepth + 1, visited));
    }

    return maxDepth;
  }

  private countRequiredProperties(obj: unknown): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    const objRecord = obj as Record<string, unknown>;
    let count = 0;
    if (Array.isArray(objRecord.required)) {
      count += objRecord.required.length;
    }

    if (objRecord.properties && typeof objRecord.properties === 'object') {
      for (const prop of Object.values(objRecord.properties as Record<string, unknown>)) {
        count += this.countRequiredProperties(prop);
      }
    }

    return count;
  }

  private calculateCentrality(nodeId: string, schemas: Schema[], edges: ReferenceEdge[]): number {
    // Simple degree centrality calculation
    const inDegree = edges.filter((e) => e.target === nodeId).length;
    const outDegree = edges.filter((e) => e.source === nodeId).length;
    const totalDegree = inDegree + outDegree;
    const maxPossibleDegree = (schemas.length - 1) * 2;

    return maxPossibleDegree > 0 ? totalDegree / maxPossibleDegree : 0;
  }

  private countConnectedComponents(nodes: ReferenceNode[], edges: ReferenceEdge[]): number {
    const visited = new Set<string>();
    let components = 0;

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Find connected nodes
      const connectedEdges = edges.filter((e) => e.source === nodeId || e.target === nodeId);
      for (const edge of connectedEdges) {
        const nextNode = edge.source === nodeId ? edge.target : edge.source;
        dfs(nextNode);
      }
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
        components++;
      }
    }

    return components;
  }

  private estimateMemoryUsage(schemas: Schema[]): number {
    // Rough estimation of memory usage in bytes
    const totalSize = schemas.reduce((sum, schema) => {
      return sum + JSON.stringify(schema).length * 2; // Rough UTF-16 estimation
    }, 0);

    return totalSize;
  }

  /**
   * Clears the analytics cache.
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Analytics: Cache cleared');
  }

  /**
   * Gets cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
