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
  /** Duplicate and near-duplicate analysis */
  duplicates: DuplicateGroup[];
  nearDuplicates: NearDuplicatePair[];
  /** Field-level consistency and conflicts */
  fieldInsights: FieldInsights;
  /** Groups of schemas that appear similar by name tokens (e.g., Address, ClientAddress) */
  nameSimilarGroups: NameSimilarGroup[];
  /** Actionable suggestions derived from analytics */
  suggestions: Suggestion[];
  /** Overall maturity score 0-100 */
  maturityScore: number;
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

/** Exact duplicate schema group */
export interface DuplicateGroup {
  /** Canonical structural signature */
  signature: string;
  /** Schemas sharing this signature */
  schemas: Array<{ id: string; name: string }>;
}

/** Near-duplicate schema pair */
export interface NearDuplicatePair {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  /** Jaccard similarity in range [0,1] */
  similarity: number;
  overlapFields: number;
  unionFields: number;
}

/** Field-level aggregated insight */
export interface FieldInsightItem {
  name: string;
  types: string[];
  formats: string[];
  /** Canonical enum value set (union of values) */
  enumValues?: string[];
  requiredIn: string[]; // schema names where required
  optionalIn: string[]; // schema names where optional
  descriptions: string[];
  occurrences: number;
  conflicts: {
    typeConflict: boolean;
    formatConflict: boolean;
    enumConflict: boolean;
    requiredConflict: boolean;
    descriptionDivergence: boolean;
  };
}

/** Summary of all field insights */
export interface FieldInsights {
  items: FieldInsightItem[];
  conflictCounts: {
    typeConflicts: number;
    formatConflicts: number;
    enumConflicts: number;
    requiredConflicts: number;
    descriptionConflicts: number;
  };
}

/** Group of schemas sharing a common name token (e.g., "address") */
export interface NameSimilarGroup {
  /** Shared token (lowercase) */
  token: string;
  /** Suggested canonical schema name (PascalCase) */
  suggestedCanonicalName: string;
  /** Schemas in this group */
  schemas: Array<{ id: string; name: string }>;
  /** Average content similarity across the group [0,1] */
  averageSimilarity: number;
}

export type SuggestionCategory =
  | 'naming'
  | 'reuse'
  | 'field-consistency'
  | 'references'
  | 'complexity';

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  impactScore: number; // 0-100
  affectedSchemas: string[]; // schema names
  data: Record<string, unknown>;
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
      logger.info('Analytics: Starting schema analysis', {
        schemaCount: schemas.length,
      });

      // Perform analysis
      const circularReferences = this.detectCircularReferences(schemas);
      const complexityMetrics = this.calculateComplexityMetrics(schemas);
      const referenceGraph = this.buildReferenceGraph(schemas);
      const duplicates = this.detectDuplicateSchemas(schemas);
      const nearDuplicates = this.detectNearDuplicateSchemas(schemas, 0.8);
      const nameSimilarGroups = this.detectNameSimilarGroups(schemas, 0);
      const fieldInsights = this.analyzeFields(schemas);
      const projectMetrics = this.calculateProjectMetrics(
        schemas,
        complexityMetrics,
        circularReferences,
      );

      const suggestions = this.generateSuggestions({
        schemas,
        duplicates,
        nearDuplicates,
        nameSimilarGroups,
        fieldInsights,
        circularReferences,
        complexityMetrics,
        projectMetrics,
        referenceGraph,
      });

      const maturityScore = this.calculateMaturityScore({
        suggestions,
        projectMetrics,
      });

      const duration = Date.now() - startTime;
      const result: AnalyticsResult = {
        circularReferences,
        complexityMetrics,
        referenceGraph,
        duplicates,
        nearDuplicates,
        nameSimilarGroups,
        suggestions,
        maturityScore,
        fieldInsights,
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

  private generateSuggestions(input: {
    schemas: Schema[];
    duplicates: DuplicateGroup[];
    nearDuplicates: NearDuplicatePair[];
    nameSimilarGroups: NameSimilarGroup[];
    fieldInsights: FieldInsights;
    circularReferences: CircularReference[];
    complexityMetrics: Map<string, ComplexityMetrics>;
    projectMetrics: AnalyticsResult['projectMetrics'];
    referenceGraph?: ReferenceGraph;
  }): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const schemaById = new Map(input.schemas.map((s) => [s.id, s]));
    const inDegreeByName = new Map<string, number>();
    const centralThreshold = 3;
    if (input.referenceGraph) {
      for (const node of input.referenceGraph.nodes) {
        const s = schemaById.get(node.id);
        if (s) inDegreeByName.set(s.name, node.inDegree);
      }
    }

    // Naming consolidation
    for (const g of input.nameSimilarGroups) {
      if (g.schemas.length < 2) continue;
      const affected = g.schemas.map((s) => s.name);
      const severity: Suggestion['severity'] =
        g.averageSimilarity >= 0.5
          ? 'high'
          : g.averageSimilarity >= 0.25
            ? 'medium'
            : 'low';
      const impact = Math.min(
        100,
        Math.round(g.schemas.length * (g.averageSimilarity * 60 + 20)),
      );
      suggestions.push({
        id: `naming:${g.token}`,
        category: 'naming',
        title: `Consolidate “${g.token}” schemas → ${g.suggestedCanonicalName}`,
        description: `Found ${g.schemas.length} schemas sharing token “${g.token}”. Consider consolidating to a single schema named ${g.suggestedCanonicalName}.`,
        severity,
        impactScore: impact,
        affectedSchemas: affected,
        data: { group: g },
      });
    }

    // Reuse extraction: exact duplicates
    for (const d of input.duplicates) {
      const affected = d.schemas.map((s) => s.name);
      const impact = Math.min(100, d.schemas.length * 20);
      suggestions.push({
        id: `reuse:dup:${d.signature.slice(0, 16)}`,
        category: 'reuse',
        title: `Extract shared schema for ${d.schemas.length} duplicates`,
        description: `These schemas are structurally identical. Extract a single shared schema and reference it to reduce duplication.`,
        severity: 'high',
        impactScore: impact,
        affectedSchemas: affected,
        data: { group: d },
      });
    }

    // Reuse extraction: near-duplicates (align to central entity if present)
    const nearByKey = new Map<string, NearDuplicatePair[]>();
    for (const p of input.nearDuplicates) {
      const key = [p.aName, p.bName].sort().join('::');
      const list = nearByKey.get(key) || [];
      list.push(p);
      nearByKey.set(key, list);
    }
    for (const [key, pairs] of nearByKey.entries()) {
      const [aName, bName] = key.split('::');
      const avgSim = pairs.reduce((s, p) => s + p.similarity, 0) / pairs.length;
      const severity: Suggestion['severity'] =
        avgSim >= 0.85 ? 'high' : avgSim >= 0.7 ? 'medium' : 'low';
      const impact = Math.min(100, Math.round(avgSim * 100));
      // Centrality-aware messaging
      const aIn = inDegreeByName.get(aName) || 0;
      const bIn = inDegreeByName.get(bName) || 0;
      let title = `Normalize ${aName} and ${bName} (similar structures)`;
      let description = `Schemas appear similar (avg similarity ${(avgSim * 100).toFixed(0)}%). Consider refactoring into a shared base or extracting common parts.`;
      if (aIn >= centralThreshold && bIn < centralThreshold) {
        title = `Align ${bName} to central ${aName}`;
        description = `${aName} is widely reused. Prefer aligning ${bName} to ${aName} rather than introducing a new base.`;
      } else if (bIn >= centralThreshold && aIn < centralThreshold) {
        title = `Align ${aName} to central ${bName}`;
        description = `${bName} is widely reused. Prefer aligning ${aName} to ${bName} rather than introducing a new base.`;
      }
      suggestions.push({
        id: `reuse:near:${key}`,
        category: 'reuse',
        title,
        description,
        severity,
        impactScore: impact,
        affectedSchemas: [aName, bName],
        data: { pairs },
      });
    }

    // Inline duplication mining: extract frequent inline sub-structures (exclude $ref and existing central schemas)
    const signatureBySchemaName = new Map<string, string>();
    for (const s of input.schemas) {
      signatureBySchemaName.set(s.name, this.buildStructuralSignature(s.content));
    }
    const inlineMap = this.collectInlineDuplication(input.schemas);
    for (const [sig, parents] of inlineMap.entries()) {
      // Skip if signature already corresponds to a central schema (good reuse)
      let matchesCentral = false;
      if (input.referenceGraph) {
        for (const node of input.referenceGraph.nodes) {
          const schema = schemaById.get(node.id);
          if (!schema) continue;
          if (signatureBySchemaName.get(schema.name) === sig && node.inDegree >= centralThreshold) {
            matchesCentral = true;
            break;
          }
        }
      }
      if (matchesCentral) continue;
      if (parents.size >= 3) {
        const affected = Array.from(parents);
        const impact = Math.min(100, parents.size * 15);
        suggestions.push({
          id: `reuse:inline:${sig.slice(0, 16)}`,
          category: 'reuse',
          title: `Extract shared sub-schema used in ${parents.size} places`,
          description: 'A repeating inline structure was found across multiple schemas. Extract it into a shared definition and reference it.',
          severity: 'medium',
          impactScore: impact,
          affectedSchemas: affected,
          data: { kind: 'inline-dup', signature: sig, parents: affected },
        });
      }
    }

    // Field consistency
    for (const f of input.fieldInsights.items) {
      if (
        !(
          f.conflicts.typeConflict ||
          f.conflicts.formatConflict ||
          f.conflicts.enumConflict ||
          f.conflicts.requiredConflict ||
          f.conflicts.descriptionDivergence
        )
      )
        continue;

      const severity: Suggestion['severity'] =
        f.conflicts.typeConflict || f.conflicts.enumConflict
          ? 'high'
          : f.conflicts.formatConflict || f.conflicts.requiredConflict
            ? 'medium'
            : 'low';
      const impact = Math.min(
        100,
        f.occurrences *
          (severity === 'high' ? 8 : severity === 'medium' ? 5 : 3),
      );
      const proposal = this.proposeFieldCanonical(f);
      suggestions.push({
        id: `field:${f.name}`,
        category: 'field-consistency',
        title: `Unify field “${f.name}” across schemas`,
        description: `Conflicts detected: ${[
          f.conflicts.typeConflict ? 'type' : '',
          f.conflicts.formatConflict ? 'format' : '',
          f.conflicts.enumConflict ? 'enum' : '',
          f.conflicts.requiredConflict ? 'required' : '',
          f.conflicts.descriptionDivergence ? 'description' : '',
        ]
          .filter(Boolean)
          .join(', ')}. ${proposal ? `Proposed: ${proposal}` : ''}`,
        severity,
        impactScore: impact,
        affectedSchemas: [],
        data: { field: f, proposal },
      });
    }

    // References quality: circular refs
    if (input.circularReferences.length > 0) {
      const impact = Math.min(100, input.circularReferences.length * 10);
      suggestions.push({
        id: `refs:circular`,
        category: 'references',
        title: `Resolve ${input.circularReferences.length} circular reference(s)`,
        description:
          'Circular references complicate validation and tooling. Break cycles by introducing interfaces or indirection.',
        severity: 'high',
        impactScore: impact,
        affectedSchemas: input.projectMetrics.circularSchemas,
        data: { circular: input.circularReferences },
      });
    }

    // Complexity hotspots: top 5
    const topComplex = Array.from(input.complexityMetrics.entries())
      .sort((a, b) => b[1].complexityScore - a[1].complexityScore)
      .slice(0, 5);
    if (topComplex.length > 0) {
      const names = topComplex
        .map(([id]) => schemaById.get(id)?.name || id)
        .filter(Boolean) as string[];
      const worst = topComplex[0][1].complexityScore;
      const impact = Math.min(100, Math.round(worst));
      suggestions.push({
        id: `complexity:top`,
        category: 'complexity',
        title: `Reduce complexity in top schemas`,
        description: `Most complex schema score: ${worst}. Consider splitting or simplifying deeply nested structures.`,
        severity: worst >= 75 ? 'high' : worst >= 50 ? 'medium' : 'low',
        impactScore: impact,
        affectedSchemas: names,
        data: { topComplex },
      });
    }

    // Sort by impact
    suggestions.sort((a, b) => b.impactScore - a.impactScore);
    return suggestions;
  }

  private calculateMaturityScore(input: {
    suggestions: Suggestion[];
    projectMetrics: AnalyticsResult['projectMetrics'];
  }): number {
    // Start from 100 and subtract penalties by severity and count
    let score = 100;
    const severityWeights: Record<Suggestion['severity'], number> = {
      high: 8,
      medium: 4,
      low: 2,
    };
    for (const s of input.suggestions) {
      score -= severityWeights[s.severity];
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    return score;
  }

  private collectInlineDuplication(schemas: Schema[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>(); // signature -> parent schema names
    for (const s of schemas) {
      const visited = new Set<unknown>();
      const walk = (node: unknown) => {
        if (!node || typeof node !== 'object' || visited.has(node)) return;
        visited.add(node);
        const obj = node as Record<string, unknown>;
        // Ignore $ref nodes
        if (typeof obj.$ref === 'string') return;
        // Require non-trivial object with properties/items
        const hasStructure = !!obj.properties || !!obj.items;
        if (hasStructure) {
          const sig = this.buildStructuralSignature(obj);
          if (sig.length > 2) {
            const parents = map.get(sig) || new Set<string>();
            parents.add(s.name);
            map.set(sig, parents);
          }
        }
        if (obj.properties && typeof obj.properties === 'object') {
          for (const child of Object.values(obj.properties as Record<string, unknown>)) {
            walk(child);
          }
        }
        if (obj.items) walk(obj.items);
        if (obj.additionalProperties && typeof obj.additionalProperties === 'object') {
          walk(obj.additionalProperties);
        }
      };
      walk(s.content);
    }
    return map;
  }

  private proposeFieldCanonical(f: FieldInsightItem): string | null {
    const name = f.name.toLowerCase();
    // Identifiers
    if (name === 'id' || name.endsWith('id') || name.endsWith('_id') || name === 'externalid' || name === 'external_id') {
      return 'type: string, format: uuid';
    }
    // Dates/times
    if (name.endsWith('date') && !name.includes('time')) {
      return 'type: string, format: date';
    }
    if (name.endsWith('at') || name.includes('timestamp') || name.endsWith('datetime') || name.endsWith('time')) {
      return 'type: string, format: date-time';
    }
    // Common contact/URL
    if (name.includes('email')) {
      return 'type: string, format: email';
    }
    if (name.includes('url') || name.includes('uri')) {
      return 'type: string, format: uri';
    }
    if (name.includes('phone') || name.includes('tel')) {
      return 'type: string, pattern: phone'; // e.g., E.164
    }
    // Monetary
    if (name.endsWith('amount') || name.includes('price') || name.endsWith('value')) {
      return 'type: number';
    }
    if (name.includes('currency')) {
      return 'type: string, pattern: ^[A-Z]{3}$';
    }
    // Localization/country
    if (name.includes('country') && name.endsWith('code')) {
      return 'type: string, pattern: ^[A-Z]{2}$';
    }
    if (name.endsWith('country')) {
      return 'type: string';
    }
    if (name.includes('language') || name.includes('locale')) {
      return 'type: string, pattern: ^[a-z]{2}(-[A-Z]{2})?$';
    }
    // Postal codes
    if (name.includes('postal') || name.includes('zipcode') || name.includes('zip')) {
      return 'type: string';
    }
    // Names
    if (name.endsWith('name') || name === 'firstname' || name === 'lastname') {
      return 'type: string';
    }
    // Flags
    if (name.startsWith('is') || name.startsWith('has') || name.startsWith('can') || name.startsWith('should')) {
      return 'type: boolean';
    }
    // Counting/index
    if (name.endsWith('count') || name.endsWith('quantity') || name.endsWith('index')) {
      return 'type: integer';
    }
    // Codes, status, type
    if (name.endsWith('code')) {
      return 'type: string';
    }
    if (name.endsWith('status') || name.endsWith('type') || name.endsWith('category')) {
      if (f.enumValues && f.enumValues.length > 0) {
        return `enum: ${f.enumValues.length} values (prefer UPPER_SNAKE_CASE)`;
      }
      return 'type: string (consider enum)';
    }
    return null;
  }

  /** Detect exact duplicate schemas using a structural canonical signature */
  public detectDuplicateSchemas(schemas: Schema[]): DuplicateGroup[] {
    const signatureToSchemas = new Map<
      string,
      Array<{ id: string; name: string }>
    >();
    for (const s of schemas) {
      const signature = this.buildStructuralSignature(s.content);
      const list = signatureToSchemas.get(signature) || [];
      list.push({ id: s.id, name: s.name });
      signatureToSchemas.set(signature, list);
    }
    const groups: DuplicateGroup[] = [];
    for (const [signature, list] of signatureToSchemas.entries()) {
      if (list.length > 1) {
        groups.push({
          signature,
          schemas: list.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }
    groups.sort((a, b) => b.schemas.length - a.schemas.length);
    return groups;
  }

  /** Detect near-duplicate schemas using Jaccard similarity over name:type field signatures */
  public detectNearDuplicateSchemas(
    schemas: Schema[],
    threshold: number = 0.8,
  ): NearDuplicatePair[] {
    const fieldSets = new Map<string, Set<string>>();
    for (const s of schemas) {
      fieldSets.set(s.id, this.extractFieldSignatures(s.content));
    }
    const pairs: NearDuplicatePair[] = [];
    for (let i = 0; i < schemas.length; i++) {
      for (let j = i + 1; j < schemas.length; j++) {
        const a = schemas[i];
        const b = schemas[j];
        const sa = fieldSets.get(a.id)!;
        const sb = fieldSets.get(b.id)!;
        if (sa.size === 0 && sb.size === 0) continue;
        let overlap = 0;
        for (const v of sa) if (sb.has(v)) overlap++;
        const union = new Set([...sa, ...sb]).size;
        const sim = union > 0 ? overlap / union : 0;
        if (sim >= threshold && overlap >= 3) {
          pairs.push({
            aId: a.id,
            bId: b.id,
            aName: a.name,
            bName: b.name,
            similarity: Number(sim.toFixed(3)),
            overlapFields: overlap,
            unionFields: union,
          });
        }
      }
    }
    pairs.sort(
      (x, y) =>
        y.similarity - x.similarity || y.overlapFields - x.overlapFields,
    );
    return pairs;
  }

  /**
   * Detect schema name similarity groups based on shared tokens (e.g., address, clientAddress, customerAddress).
   * Also computes an average content similarity using Jaccard on field signatures to support consolidation suggestions.
   */
  public detectNameSimilarGroups(
    schemas: Schema[],
    minAverageSimilarity: number = 0,
  ): NameSimilarGroup[] {
    // Tokenize names by lowercasing and splitting camelCase/snake/kebab; also strip common prefixes like client/customer/user
    const tokenMap = new Map<
      string,
      Array<{ id: string; name: string; fieldSet: Set<string> }>
    >();

    const splitName = (name: string): string[] => {
      const base = name
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
        .replace(/[_-]+/g, ' ')
        .toLowerCase();
      const parts = base.split(/\s+/).filter(Boolean);
      // Also include suffix/prefix stripped forms for common qualifiers
      const qualifiers = [
        'client',
        'customer',
        'user',
        'internal',
        'external',
        'api',
      ];
      const stopwords = new Set([
        'library',
        'libraries',
        'enum',
        'enums',
        'line',
        'lines',
        'detail',
        'details',
        'model',
        'models',
        'category',
        'categories',
        'request',
        'response',
        'history',
        'options',
        'option',
        'ids',
        'id',
        'type',
        'types',
        'status',
        'statuses',
        'code',
        'codes',
      ]);
      const tokens = new Set<string>(parts);
      for (const p of parts) {
        for (const q of qualifiers) {
          if (p.startsWith(q) && p.length > q.length)
            tokens.add(p.slice(q.length));
          if (p.endsWith(q) && p.length > q.length)
            tokens.add(p.slice(0, p.length - q.length));
        }
      }
      return Array.from(tokens).filter(
        (t) => t.length >= 3 && !stopwords.has(t) && !/^\d+$/.test(t),
      );
    };

    const schemaInfo = schemas.map((s) => ({
      id: s.id,
      name: s.name,
      tokens: splitName(s.name),
      fieldSet: this.extractFieldSignatures(s.content),
    }));

    for (const info of schemaInfo) {
      for (const tok of info.tokens) {
        const arr = tokenMap.get(tok) || [];
        arr.push({ id: info.id, name: info.name, fieldSet: info.fieldSet });
        tokenMap.set(tok, arr);
      }
    }

    const groups: NameSimilarGroup[] = [];
    for (const [token, list] of tokenMap.entries()) {
      if (list.length < 2) continue; // need at least 2

      // Compute average Jaccard similarity across all pairs
      let sum = 0;
      let pairs = 0;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i].fieldSet;
          const b = list[j].fieldSet;
          if (a.size === 0 && b.size === 0) continue;
          let overlap = 0;
          for (const v of a) if (b.has(v)) overlap++;
          const union = new Set([...a, ...b]).size;
          const sim = union > 0 ? overlap / union : 0;
          sum += sim;
          pairs++;
        }
      }
      const avgSim = pairs > 0 ? Number((sum / pairs).toFixed(3)) : 0;
      if (avgSim < minAverageSimilarity) continue;

      // Suggest canonical PascalCase name from token
      const suggested = token
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join('');

      groups.push({
        token,
        suggestedCanonicalName: suggested,
        schemas: list
          .map(({ id, name }) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        averageSimilarity: avgSim,
      });
    }

    // Prioritize larger groups and higher similarity
    groups.sort(
      (a, b) =>
        b.schemas.length - a.schemas.length ||
        b.averageSimilarity - a.averageSimilarity,
    );
    return groups;
  }

  /** Field-level aggregation and conflict detection */
  public analyzeFields(schemas: Schema[]): FieldInsights {
    interface Acc {
      types: Set<string>;
      formats: Set<string>;
      enumSets: Set<string>; // canonicalized enum sets
      requiredIn: Set<string>;
      optionalIn: Set<string>;
      descriptions: Set<string>;
      occurrences: number;
    }

    const map = new Map<string, Acc>();

    const visit = (
      obj: unknown,
      _requiredSet: Set<string> | null,
      schemaName: string,
    ) => {
      if (!obj || typeof obj !== 'object') return;
      const rec = obj as Record<string, unknown>;

      // properties
      if (rec.properties && typeof rec.properties === 'object') {
        const props = rec.properties as Record<string, unknown>;
        const req = new Set(
          Array.isArray(rec.required) ? (rec.required as string[]) : [],
        );
        for (const [propName, propSchema] of Object.entries(props)) {
          const key = propName; // aggregate by field name globally
          let acc = map.get(key);
          if (!acc) {
            acc = {
              types: new Set<string>(),
              formats: new Set<string>(),
              enumSets: new Set<string>(),
              requiredIn: new Set<string>(),
              optionalIn: new Set<string>(),
              descriptions: new Set<string>(),
              occurrences: 0,
            };
            map.set(key, acc);
          }
          acc.occurrences++;

          const p = propSchema as Record<string, unknown>;
          const typeVal = typeof p.type === 'string' ? (p.type as string) : '';
          if (typeVal) acc.types.add(typeVal);
          const fmt = typeof p.format === 'string' ? (p.format as string) : '';
          if (fmt) acc.formats.add(fmt);
          if (Array.isArray(p.enum)) {
            const canonEnum = JSON.stringify(
              (p.enum as unknown[]).map((v) => String(v)).sort(),
            );
            acc.enumSets.add(canonEnum);
          }
          const desc =
            typeof p.description === 'string' ? (p.description as string) : '';
          if (desc) acc.descriptions.add(this.normalizeDescription(desc));

          if (req.has(propName)) acc.requiredIn.add(schemaName);
          else acc.optionalIn.add(schemaName);

          // Recurse nested schemas
          visit(propSchema, req, schemaName);
        }
      }

      // items
      if (rec.items) visit(rec.items, null, schemaName);
      if (
        rec.additionalProperties &&
        typeof rec.additionalProperties === 'object'
      ) {
        visit(rec.additionalProperties, null, schemaName);
      }
    };

    for (const s of schemas) {
      visit(s.content, null, s.name);
    }

    const items: FieldInsightItem[] = [];
    let typeConflicts = 0,
      formatConflicts = 0,
      enumConflicts = 0,
      requiredConflicts = 0,
      descriptionConflicts = 0;

    for (const [name, acc] of map.entries()) {
      const conflicts = {
        typeConflict: acc.types.size > 1,
        formatConflict: acc.formats.size > 1,
        enumConflict: acc.enumSets.size > 1,
        requiredConflict: acc.requiredIn.size > 0 && acc.optionalIn.size > 0,
        descriptionDivergence: acc.descriptions.size > 1,
      };
      if (conflicts.typeConflict) typeConflicts++;
      if (conflicts.formatConflict) formatConflicts++;
      if (conflicts.enumConflict) enumConflicts++;
      if (conflicts.requiredConflict) requiredConflicts++;
      if (conflicts.descriptionDivergence) descriptionConflicts++;

      const enumValues = acc.enumSets.size
        ? Array.from(
            new Set(
              Array.from(acc.enumSets).flatMap(
                (e) => JSON.parse(e) as string[],
              ),
            ),
          ).sort()
        : undefined;

      const base: Omit<FieldInsightItem, 'enumValues'> & {
        enumValues?: string[];
      } = {
        name,
        types: Array.from(acc.types).sort(),
        formats: Array.from(acc.formats).sort(),
        requiredIn: Array.from(acc.requiredIn).sort(),
        optionalIn: Array.from(acc.optionalIn).sort(),
        descriptions: Array.from(acc.descriptions).sort(),
        occurrences: acc.occurrences,
        conflicts,
      };
      if (enumValues) {
        (base as FieldInsightItem).enumValues = enumValues;
      }
      items.push(base as FieldInsightItem);
    }

    // Sort items: conflicts first, then by occurrences
    items.sort((a, b) => {
      const aConf = Number(
        a.conflicts.typeConflict ||
          a.conflicts.formatConflict ||
          a.conflicts.enumConflict ||
          a.conflicts.requiredConflict ||
          a.conflicts.descriptionDivergence,
      );
      const bConf = Number(
        b.conflicts.typeConflict ||
          b.conflicts.formatConflict ||
          b.conflicts.enumConflict ||
          b.conflicts.requiredConflict ||
          b.conflicts.descriptionDivergence,
      );
      if (aConf !== bConf) return bConf - aConf;
      return b.occurrences - a.occurrences;
    });

    return {
      items,
      conflictCounts: {
        typeConflicts,
        formatConflicts,
        enumConflicts,
        requiredConflicts,
        descriptionConflicts,
      },
    };
  }

  /** Build a structural canonical signature focusing on types, properties, required, enums and formats */
  private buildStructuralSignature(node: unknown): string {
    const canon = (n: unknown): unknown => {
      if (!n || typeof n !== 'object') return n;
      if (Array.isArray(n)) return n.map((x) => canon(x));
      const r = n as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      // Only keep structural keys
      const keys = Object.keys(r).sort();
      for (const k of keys) {
        if (
          k === 'type' ||
          k === 'properties' ||
          k === 'required' ||
          k === 'items' ||
          k === 'enum' ||
          k === 'format' ||
          k === 'additionalProperties'
        ) {
          if (
            k === 'properties' &&
            r.properties &&
            typeof r.properties === 'object'
          ) {
            const props = r.properties as Record<string, unknown>;
            const sorted: Record<string, unknown> = {};
            for (const key of Object.keys(props).sort()) {
              sorted[key] = canon(props[key]);
            }
            out.properties = sorted;
          } else if (k === 'required' && Array.isArray(r.required)) {
            out.required = (r.required as unknown[])
              .map((x) => String(x))
              .sort();
          } else if (k === 'enum' && Array.isArray(r.enum)) {
            out.enum = (r.enum as unknown[]).map((x) => String(x)).sort();
          } else {
            out[k] = canon(r[k]);
          }
        }
      }
      return out;
    };
    return JSON.stringify(canon(node));
  }

  /** Extract a set of simple field signatures name:type across all nested properties */
  private extractFieldSignatures(node: unknown): Set<string> {
    const set = new Set<string>();
    const walk = (n: unknown) => {
      if (!n || typeof n !== 'object') return;
      const r = n as Record<string, unknown>;
      if (r.properties && typeof r.properties === 'object') {
        const props = r.properties as Record<string, unknown>;
        for (const [name, child] of Object.entries(props)) {
          const typeVal =
            child &&
            typeof child === 'object' &&
            typeof (child as any).type === 'string'
              ? String((child as any).type)
              : '';
          set.add(`${name}:${typeVal}`);
          walk(child);
        }
      }
      if (r.items) walk(r.items);
      if (
        r.additionalProperties &&
        typeof r.additionalProperties === 'object'
      ) {
        walk(r.additionalProperties);
      }
    };
    walk(node);
    return set;
  }

  private normalizeDescription(desc: string): string {
    return desc.trim().toLowerCase().replace(/\s+/g, ' ');
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
        const minId = normalizedCycle.reduce((min, current) =>
          current < min ? current : min,
        );
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
          const referencedSchema = schemas.find(
            (s) => s.name === ref.schemaName,
          );
          if (referencedSchema) {
            dfs(
              referencedSchema.id,
              [...path, schemaId],
              visited,
              recursionStack,
            );
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
  public calculateComplexityMetrics(
    schemas: Schema[],
  ): Map<string, ComplexityMetrics> {
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
        propertyCount * 0.3 +
          maxDepth * 5 +
          referenceCount * 2 +
          (sizeBytes / 1000) * 0.1,
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

          inDegreeMap.set(
            targetSchema.id,
            (inDegreeMap.get(targetSchema.id) || 0) + 1,
          );
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
    const complexityScores = Array.from(complexityMetrics.values()).map(
      (m) => m.complexityScore,
    );
    const averageComplexity =
      complexityScores.length > 0
        ? complexityScores.reduce((sum, score) => sum + score, 0) /
          complexityScores.length
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
          referenceCounts.set(
            targetSchema.name,
            (referenceCounts.get(targetSchema.name) || 0) + 1,
          );
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
          !schemas.some((s) =>
            s.references.some((ref) => ref.schemaName === schema.name),
          ),
      )
      .map((schema) => schema.name);

    // Find schemas involved in circular references
    const circularSchemas = Array.from(
      new Set(circularReferences.flatMap((cr) => cr.path)),
    ).filter(Boolean); // Path now contains schema names directly

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
    const lastModified = Math.max(
      ...schemas.map((s) => {
        if (!s.metadata.lastModified) return 0;
        const date = new Date(s.metadata.lastModified);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      }),
    );
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
      for (const prop of Object.values(
        objRecord.properties as Record<string, unknown>,
      )) {
        count += this.countProperties(prop, visited);
      }
    }

    if (objRecord.items) {
      count += this.countProperties(objRecord.items, visited);
    }

    if (
      objRecord.additionalProperties &&
      typeof objRecord.additionalProperties === 'object'
    ) {
      count += this.countProperties(objRecord.additionalProperties, visited);
    }

    return count;
  }

  private calculateMaxDepth(
    obj: unknown,
    currentDepth = 0,
    visited = new Set(),
  ): number {
    if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
      return currentDepth;
    }

    const objRecord = obj as Record<string, unknown>;
    visited.add(obj);
    let maxDepth = currentDepth;

    if (objRecord.properties && typeof objRecord.properties === 'object') {
      for (const prop of Object.values(
        objRecord.properties as Record<string, unknown>,
      )) {
        maxDepth = Math.max(
          maxDepth,
          this.calculateMaxDepth(prop, currentDepth + 1, visited),
        );
      }
    }

    if (objRecord.items) {
      maxDepth = Math.max(
        maxDepth,
        this.calculateMaxDepth(objRecord.items, currentDepth + 1, visited),
      );
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
      for (const prop of Object.values(
        objRecord.properties as Record<string, unknown>,
      )) {
        count += this.countRequiredProperties(prop);
      }
    }

    return count;
  }

  private calculateCentrality(
    nodeId: string,
    schemas: Schema[],
    edges: ReferenceEdge[],
  ): number {
    // Simple degree centrality calculation
    const inDegree = edges.filter((e) => e.target === nodeId).length;
    const outDegree = edges.filter((e) => e.source === nodeId).length;
    const totalDegree = inDegree + outDegree;
    const maxPossibleDegree = (schemas.length - 1) * 2;

    return maxPossibleDegree > 0 ? totalDegree / maxPossibleDegree : 0;
  }

  private countConnectedComponents(
    nodes: ReferenceNode[],
    edges: ReferenceEdge[],
  ): number {
    const visited = new Set<string>();
    let components = 0;

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Find connected nodes
      const connectedEdges = edges.filter(
        (e) => e.source === nodeId || e.target === nodeId,
      );
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
