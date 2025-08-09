# Analytics Enhancements Plan

## Phase 1 (implemented)

- Duplicate detection
  - Exact duplicates via canonical structural signature (types/properties/required/items/enum/format/additionalProperties)
  - Near-duplicates via Jaccard similarity on field signatures (name:type), threshold 0.8, min overlap 3
- Field consistency analysis
  - Aggregation per field name across all schemas: types, formats, enums, requiredness, descriptions, occurrences
  - Conflict flags: type, format, enum, required, description divergence
- UI updates
  - New Analytics tabs: Duplicates and Fields
  - Duplicates: grouped exact duplicates, list of near-duplicate pairs with similarity and overlap
  - Fields: field list with conflict badges and detail chips

## Immediate next steps

- Controls & filters
  - Threshold slider for near-duplicates; min-overlap input
  - Filters in Fields tab by conflict type and search
- Background processing
  - Use background analytics hook with debounce and progress instead of synchronous run
- Export
  - Export JSON/CSV for duplicates, near-duplicates, and field conflicts

## Phase 2

- Graph & reference quality
  - SCC-based cycle grouping (Tarjan/Kosaraju), rank by size/depth/centrality
  - Dead/invalid refs; fan-in/out hotspots; orphans/unused definitions improvements
- Synonym detection
  - String similarity (e.g., Jaro-Winkler) for potential field-name convergence suggestions
- Governance/policies
  - Conventions: camelCase, UUID (string+format), date/time formats, enum casing
  - Lint rules & maturity score; add Governance tab with export

## Phase 3 (fix-it automations)

- Safe refactors with preview
  - Extract shared schema from duplicate groups and replace occurrences with $ref
  - Normalize field type/format/enum across selected schemas
  - Bulk rename field across project with preview and confirm
- IPC-backed writes guarded by confirmation dialogs

## Testing

- Unit tests for:
  - detectDuplicateSchemas
  - detectNearDuplicateSchemas
  - analyzeFields
- UI tests for:
  - New tabs render, filters work, exports generate files
  - Click-through opens expected schema/tab

## Performance

- Workerize analytics or offload to main via IPC for very large projects
- Cache keyed by (schemaIds, lastModified, fileSize); throttle/debounce

## Optional UX

- Governance CSV export

## Defaults (tunable)

- Field naming: camelCase
- Enum casing: UPPER_SNAKE_CASE
- Date/time: strings with formats (date/date-time)
- UUID: string + format "uuid"
- Near-duplicate similarity threshold: 0.8 (Jaccard)
- Min field overlap for near-duplicates: 3
