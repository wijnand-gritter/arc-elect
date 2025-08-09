/**
 * JSON Schema formatter that ONLY:
 * - Sorts values inside `enum` arrays A→Z
 * - Sorts keys within any `properties` object A→Z
 *
 * Everything else remains untouched. Intended to be deterministic and safe.
 */

export function formatSchemaJsonString(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If it's not valid JSON, return as-is so we don't destroy content
    return raw;
  }

  const transformed = transformNode(parsed);
  return JSON.stringify(transformed, null, 2);
}

function transformNode(node: unknown, parentKey?: string): unknown {
  if (Array.isArray(node)) {
    // ONLY sort array when it's the value of an `enum` key
    if (parentKey === 'enum') {
      return [...node].sort((a, b) => String(a).localeCompare(String(b)));
    }
    // Recurse into array items without reordering
    return node.map((item) => transformNode(item));
  }

  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    // Recurse first to ensure nested `properties`/`enum` are transformed
    const entries = Object.entries(obj).map(([key, value]) => [
      key,
      transformNode(value, key),
    ]) as [string, unknown][];

    if (Object.prototype.hasOwnProperty.call(obj, 'properties')) {
      const props = obj['properties'];
      if (props && typeof props === 'object' && !Array.isArray(props)) {
        const sortedProps = sortObjectKeysAtoZ(
          props as Record<string, unknown>,
        );
        // Rebuild object with the sorted `properties` while preserving sibling key order
        const rebuilt: Record<string, unknown> = {};
        for (const [k, v] of entries) {
          if (k === 'properties') {
            rebuilt[k] = sortedProps;
          } else {
            rebuilt[k] = v;
          }
        }
        return rebuilt;
      }
    }

    // For all other objects, keep original key order intact
    const rebuilt: Record<string, unknown> = {};
    for (const [k, v] of entries) rebuilt[k] = v;
    return rebuilt;
  }

  // Primitives unchanged
  return node;
}

function sortObjectKeysAtoZ(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const out: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    out[key] = obj[key];
  }
  return out;
}
