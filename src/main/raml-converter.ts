/**
 * RAML to JSON Schema Converter
 *
 * This service handles the conversion of RAML files to JSON Schema format.
 * It provides a robust conversion pipeline with error handling, validation,
 * and progress tracking.
 *
 * @module raml-converter
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import logger from './main-logger';
import type { ConversionReport, ConversionSummary } from '../types/raml-import';

type FileReportCollector = {
  filePath: string;
  inputSize?: number;
  ramlHeader?: { title?: string; version?: string; description?: string };
  enumsWritten: Array<{
    name: string;
    file?: string;
    size?: number;
    $id?: string;
  }>;
  businessObjectsWritten: Array<{
    name: string;
    file?: string;
    size?: number;
    $id?: string;
  }>;
  inferredFormats: Set<string>;
  unions: Array<{
    parentType: string;
    property: string;
    original: string;
    converted: string[];
    lineNumber?: number;
    strategy: 'anyOf' | 'oneOf' | 'type-array' | 'enum-extraction';
  }>;
  inlineEnums: Array<{
    parentType: string;
    property: string;
    newEnumName: string;
    file?: string;
    values: string[];
    lineRange?: { start: number; end: number };
  }>;
  dedupedEnums: string[];
  namingChanges: Array<{
    from: string;
    to: string;
    scope: 'type' | 'property' | 'enum' | 'file';
    context?: string;
  }>;
  propertyTransformations: Array<{
    parentType: string;
    propertyName: string;
    originalRamlLine?: string;
    originalType?: string;
    originalDescription?: string;
    isOptional?: boolean;
    lineNumber?: number;
    convertedType?: string | string[];
    format?: string;
    $ref?: string;
    items?: { type?: string; $ref?: string };
    formatReason?: string;
    typeReason?: string;
    note?: string;
  }>;
  formatInferences: Array<{
    property: string;
    parentType: string;
    originalType: string;
    format: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  // Source code comparison data
  originalRamlContent?: string;
  generatedSchemas: Array<{
    fileName: string;
    content: string;
    type: 'business-object' | 'enum';
  }>;
};

type NamingConvention =
  | 'kebab-case'
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case';

function applyNamingConvention(
  name: string,
  convention: NamingConvention,
): string {
  switch (convention) {
    case 'kebab-case':
      return name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[_\s]+/g, '-');
    case 'camelCase':
      return name
        .replace(/[-_\s]+(.)?/g, (_: string, c: string) =>
          c ? c.toUpperCase() : '',
        )
        .replace(/^./, (c) => c.toLowerCase());
    case 'PascalCase':
      return name
        .replace(/[-_\s]+(.)?/g, (_: string, c: string) =>
          c ? c.toUpperCase() : '',
        )
        .replace(/^./, (c) => c.toUpperCase());
    case 'snake_case':
      return name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[-\s]+/g, '_');
    default:
      return name;
  }
}

export interface RamlType {
  name: string;
  properties: Record<string, any>;
  required: string[];
  isEnum: boolean;
  enumValues?: string[];
  description?: string;
  isInlineEnum?: boolean;
  originalParent?: string;
  originalProperty?: string;
}

export class SimpleRamlParser {
  constructor(
    private readonly namingConvention: NamingConvention = 'camelCase',
  ) {}
  async parseFile(
    filePath: string,
    collector?: FileReportCollector,
  ): Promise<RamlType[]> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    // Capture file size, RAML content, and header information
    if (collector) {
      const stats = await fs.stat(filePath);
      collector.inputSize = stats.size;
      collector.originalRamlContent = content;

      // Parse RAML header from first few lines
      const header = this.parseRamlHeader(lines);
      collector.ramlHeader = header;
    }

    // Detect if this is a Library or DataType file
    const isLibrary = content.includes('#%RAML 1.0 Library');
    const isDataType = content.includes('#%RAML 1.0 DataType');

    if (isDataType && !isLibrary) {
      // Handle DataType format (properties directly at root level)
      return this.parseDataTypeFile(lines, filePath, collector);
    } else {
      // Handle Library format (types: section)
      return this.parseLibraryFile(lines, filePath, collector);
    }
  }

  private parseLibraryFile(
    lines: string[],
    filePath: string,
    collector?: FileReportCollector,
  ): RamlType[] {
    const types: RamlType[] = [];
    const inlineEnums: RamlType[] = [];
    let inTypes = false;
    let currentType: any = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed === 'types:') {
        inTypes = true;
        continue;
      }
      if (!inTypes) continue;
      const indent = line.length - line.trimStart().length;
      if (indent === 2 && trimmed.endsWith(':')) {
        if (currentType) types.push(currentType);
        const typeName = trimmed.slice(0, -1);
        currentType = {
          name: typeName,
          properties: {},
          required: [],
          isEnum: false,
          enumValues: [],
          description: '',
        };
        continue;
      }
      if (!currentType) continue;
      if (indent === 4) {
        if (trimmed.startsWith('description:')) {
          currentType.description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('enum:')) {
          currentType.isEnum = true;
        } else if (trimmed === 'properties:') {
          continue;
        }
      }
      if (indent === 6 && trimmed.startsWith('- ') && currentType.isEnum) {
        const enumValue = trimmed.substring(2).trim().replace(/['"]/g, '');
        currentType.enumValues.push(enumValue);
      }
      if (indent === 6 && trimmed.endsWith(':') && !currentType.isEnum) {
        const propName = trimmed.slice(0, -1);
        const isOptional = propName.endsWith('?');
        const cleanPropName = propName.replace('?', '');
        const propDetails = this.parsePropertyDetails(
          lines,
          i + 1,
          currentType.name,
          cleanPropName,
          inlineEnums,
          collector,
        );
        currentType.properties[cleanPropName] = {
          type: propDetails.type || 'string',
          description: propDetails.description || '',
          format: propDetails.format,
          items: propDetails.items,
          $ref: propDetails.$ref,
          originalType: propDetails.originalType,
        };
        if (!isOptional) {
          currentType.required.push(cleanPropName);
        }
      }
    }
    if (currentType) types.push(currentType);
    types.push(...inlineEnums);
    return types;
  }

  private parseDataTypeFile(
    lines: string[],
    filePath: string,
    collector?: FileReportCollector,
  ): RamlType[] {
    const types: RamlType[] = [];
    const inlineEnums: RamlType[] = [];

    // Extract type name from filename
    const fileName = path.basename(filePath, '.raml');
    const typeName = this.toPascalCase(fileName);

    const currentType: any = {
      name: typeName,
      properties: {},
      required: [],
      isEnum: false,
      enumValues: [],
      description: '',
    };

    let inProperties = false;
    let inEnum = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;

      // Parse root-level attributes
      if (indent === 0) {
        if (trimmed.startsWith('description:')) {
          currentType.description = trimmed.substring(12).trim();
        } else if (trimmed === 'enum:') {
          currentType.isEnum = true;
          inEnum = true;
        } else if (trimmed === 'properties:') {
          inProperties = true;
        }
        continue;
      }

      // Parse enum values
      if (inEnum && indent === 2 && trimmed.startsWith('- ')) {
        const enumValue = trimmed.substring(2).trim().replace(/['"]/g, '');
        currentType.enumValues.push(enumValue);
        continue;
      }

      // Parse properties
      if (inProperties && indent === 2 && trimmed.endsWith(':')) {
        const propName = trimmed.slice(0, -1);
        const isOptional = propName.endsWith('?');
        const cleanPropName = propName.replace('?', '');
        const propDetails = this.parsePropertyDetails(
          lines,
          i + 1,
          currentType.name,
          cleanPropName,
          inlineEnums,
          collector,
          2, // Use different base indent for DataType format (properties start at 2, details at 4)
        );
        currentType.properties[cleanPropName] = {
          type: propDetails.type || 'string',
          description: propDetails.description || '',
          format: propDetails.format,
          items: propDetails.items,
          $ref: propDetails.$ref,
          originalType: propDetails.originalType,
        };
        if (!isOptional) {
          currentType.required.push(cleanPropName);
        }
      }
    }

    types.push(currentType);
    types.push(...inlineEnums);
    return types;
  }

  parsePropertyDetails(
    lines: string[],
    startIndex: number,
    parentTypeName: string,
    propertyName: string,
    inlineEnums: RamlType[],
    collector?: FileReportCollector,
    baseIndent: number = 6, // Default for Library format
  ) {
    const details: any = {
      type: 'string',
      description: '',
      format: null,
      items: null,
      $ref: null,
      originalType: null,
    };
    let hasInlineEnum = false;
    let inlineEnumValues: string[] = [];
    let enumStartLine = -1;
    let propertyLineNumber = startIndex - 1; // The property declaration line
    let originalRamlLines: string[] = [];
    let isOptional = propertyName.endsWith('?');

    // Capture the property declaration line
    if (propertyLineNumber >= 0 && propertyLineNumber < lines.length) {
      originalRamlLines.push(lines[propertyLineNumber].trim());
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;
      if (indent <= baseIndent && trimmed.endsWith(':')) break;

      // Capture relevant RAML lines for this property
      if (indent >= baseIndent + 2) {
        originalRamlLines.push(line.trim());
      }

      if (indent === baseIndent + 2) {
        if (trimmed.startsWith('description:')) {
          details.description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('type:')) {
          const typeValue = trimmed.substring(5).trim();
          if (typeValue.includes(' | ')) {
            const unionTypes = typeValue.split(' | ').map((t) => t.trim());
            // Handle union types as array of types
            details.type = unionTypes.map((type) => this.mapRamlType(type));
            details.originalType = typeValue;
            collector?.unions.push({
              parentType: parentTypeName,
              property: propertyName,
              original: typeValue,
              converted: unionTypes,
              lineNumber: i + 1,
              strategy: 'type-array', // Default strategy, could be enhanced
            });
          } else {
            details.type = this.mapRamlType(typeValue);
            details.$ref = this.getTypeReference(typeValue);
            details.originalType = typeValue;

            // Infer format based on RAML type and property name
            const inferredFormat = this.inferFormat(typeValue, propertyName);
            if (inferredFormat.format) {
              details.format = inferredFormat.format;
              collector?.formatInferences.push({
                property: propertyName,
                parentType: parentTypeName,
                originalType: typeValue,
                format: inferredFormat.format,
                reason: inferredFormat.reason,
                confidence: inferredFormat.confidence,
              });
            }
          }
        } else if (trimmed === 'enum:') {
          hasInlineEnum = true;
          details.type = 'string';
          enumStartLine = i + 1;
        }
      }
      if (
        hasInlineEnum &&
        indent === baseIndent + 4 &&
        trimmed.startsWith('- ')
      ) {
        const enumValue = trimmed.substring(2).trim().replace(/['"]/g, '');
        inlineEnumValues.push(enumValue);
      }
      if (
        indent === baseIndent + 2 &&
        (trimmed === 'items:' || trimmed.startsWith('items:'))
      ) {
        // Handle both formats:
        // Library format: items:\n    type: SomeType
        // DataType format: items: !include some.raml

        if (trimmed.startsWith('items:') && trimmed.length > 6) {
          // DataType format: items: !include some.raml
          const itemType = trimmed.substring(6).trim();
          details.items = {
            type: this.mapRamlType(itemType),
            $ref: this.getTypeReference(itemType),
          };
        } else {
          // Library format: items: followed by type: on next line
          for (let j = i + 1; j < lines.length; j++) {
            const itemLine = lines[j];
            const itemTrimmed = itemLine.trim();
            const itemIndent = itemLine.length - itemLine.trimStart().length;
            if (
              itemIndent === baseIndent + 4 &&
              itemTrimmed.startsWith('type:')
            ) {
              const itemType = itemTrimmed.substring(5).trim();
              details.items = {
                type: this.mapRamlType(itemType),
                $ref: this.getTypeReference(itemType),
              };
              break;
            }
            if (itemIndent <= baseIndent + 2) break;
          }
        }
      }
    }

    // Enhanced property transformation recording
    const transformation: any = {
      parentType: parentTypeName,
      propertyName: propertyName,
      originalRamlLine: originalRamlLines.join('\n'),
      originalType: details.originalType,
      originalDescription: details.description,
      isOptional,
      lineNumber: propertyLineNumber + 1,
      convertedType: details.type,
      format: details.format,
      $ref: details.$ref,
      items: details.items,
    };

    if (details.format) {
      transformation.formatReason = `Inferred from RAML type '${details.originalType}' and property name '${propertyName}'`;
    }

    if (details.originalType !== details.type) {
      transformation.typeReason = `Mapped RAML type '${details.originalType}' to JSON Schema type '${details.type}'`;
    }

    collector?.propertyTransformations.push(transformation);

    // Debug logging
    if (collector && transformation.originalType) {
      logger.debug('PropertyTransformation recorded', {
        parentType: parentTypeName,
        property: propertyName,
        originalType: transformation.originalType,
        convertedType: transformation.convertedType,
        format: transformation.format,
        hasFormat: !!transformation.format,
      });
    }

    if (hasInlineEnum && inlineEnumValues.length > 0) {
      const enumTypeName = this.generateEnumName(parentTypeName, propertyName);
      const inlineEnum: RamlType = {
        name: enumTypeName,
        properties: {},
        required: [],
        isEnum: true,
        enumValues: inlineEnumValues,
        description: `Inline enum for ${parentTypeName}.${propertyName}`,
        isInlineEnum: true,
        originalParent: parentTypeName,
        originalProperty: propertyName,
      };
      inlineEnums.push(inlineEnum);
      details.$ref = `./common/enums/${enumTypeName}Enum.schema.json`;
      details.type = null;
      collector?.inlineEnums.push({
        parentType: parentTypeName,
        property: propertyName,
        newEnumName: enumTypeName,
        file: `./common/enums/${enumTypeName}Enum.schema.json`,
        values: inlineEnumValues,
        ...(enumStartLine > 0
          ? {
              lineRange: {
                start: enumStartLine,
                end: enumStartLine + inlineEnumValues.length,
              },
            }
          : {}),
      });
    }
    return details;
  }

  mapRamlType(ramlType: string) {
    if (!ramlType) return 'string';
    const cleanType = ramlType.replace(/\?$/, '');
    const typeMap: Record<string, string | null> = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      boolean: 'boolean',
      date: 'string',
      'date-only': 'string',
      datetime: 'string',
      'datetime-only': 'string',
      'datetime-with-timezone': 'string',
      time: 'string',
      'time-only': 'string',
      object: 'object',
      array: 'array',
      any: 'any',
    };
    if (typeMap[cleanType] !== undefined) return typeMap[cleanType];
    if (cleanType.includes('.')) return null;
    return 'string';
  }

  getTypeReference(ramlType: string) {
    if (!ramlType) return null;
    const cleanType = ramlType.replace(/\?$/, '');
    const basicTypes = [
      'string',
      'number',
      'integer',
      'boolean',
      'date',
      'date-only',
      'datetime',
      'datetime-only',
      'datetime-with-timezone',
      'time',
      'time-only',
      'object',
      'array',
      'any',
    ];
    if (basicTypes.includes(cleanType)) return null;

    // Handle !include directives (DataType format)
    if (cleanType.startsWith('!include ')) {
      const includePath = cleanType.substring(9).trim(); // Remove '!include '

      // Extract filename without .raml extension
      const fileName = path.basename(includePath, '.raml');

      // Check if it's in enums directory
      if (includePath.startsWith('enums/')) {
        const base = applyNamingConvention(fileName, this.namingConvention);
        return `./common/enums/${base}Enum.schema.json`;
      }

      // Regular business object reference
      const base = applyNamingConvention(fileName, this.namingConvention);
      return `./${base}.schema.json`;
    }

    // Handle library.type format (Library format)
    let typeName = cleanType;
    let libraryName = null;
    if (cleanType.includes('.')) {
      const parts = cleanType.split('.');
      libraryName = parts[0];
      typeName = parts[1];
    }
    // Apply configured naming convention to referenced filenames
    const base = applyNamingConvention(typeName, this.namingConvention);
    if (libraryName && libraryName.startsWith('enum')) {
      return `./common/enums/${base}Enum.schema.json`;
    }
    return `./${base}.schema.json`;
  }

  generateEnumName(parentTypeName: string, propertyName: string) {
    const pascalParent = this.toPascalCase(parentTypeName);
    const pascalProperty = this.toPascalCase(propertyName);
    return `${pascalParent}${pascalProperty}`;
  }

  /**
   * Infer JSON Schema format based on RAML type and property name patterns
   */
  inferFormat(
    ramlType: string,
    propertyName: string,
  ): {
    format?: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  } {
    const cleanType = ramlType.replace(/\?$/, '').toLowerCase();
    const propLower = propertyName.toLowerCase();

    // High confidence: Direct RAML type mappings
    if (cleanType === 'date') {
      return {
        format: 'date',
        reason: 'RAML type "date" maps to JSON Schema format "date"',
        confidence: 'high',
      };
    }
    if (cleanType === 'datetime' || cleanType === 'datetime-only') {
      return {
        format: 'date-time',
        reason: `RAML type "${cleanType}" maps to JSON Schema format "date-time"`,
        confidence: 'high',
      };
    }
    if (cleanType === 'time' || cleanType === 'time-only') {
      return {
        format: 'time',
        reason: `RAML type "${cleanType}" maps to JSON Schema format "time"`,
        confidence: 'high',
      };
    }

    // Medium confidence: Property name patterns for string types
    if (cleanType === 'string') {
      if (propLower.includes('email') || propLower.includes('mail')) {
        return {
          format: 'email',
          reason: `Property name "${propertyName}" suggests email format`,
          confidence: 'medium',
        };
      }
      if (
        propLower.includes('uri') ||
        propLower.includes('url') ||
        propLower.includes('link')
      ) {
        return {
          format: 'uri',
          reason: `Property name "${propertyName}" suggests URI format`,
          confidence: 'medium',
        };
      }
      if (propLower.includes('uuid') || propLower.includes('guid')) {
        return {
          format: 'uuid',
          reason: `Property name "${propertyName}" suggests UUID format`,
          confidence: 'medium',
        };
      }
      if (propLower.includes('phone') || propLower.includes('tel')) {
        return {
          format: 'regex',
          reason: `Property name "${propertyName}" suggests phone number pattern`,
          confidence: 'low',
        };
      }
      if (propLower.includes('password') || propLower.includes('secret')) {
        return {
          format: 'password',
          reason: `Property name "${propertyName}" suggests password format`,
          confidence: 'medium',
        };
      }
    }

    return {
      reason: `No format inference available for RAML type "${ramlType}" and property "${propertyName}"`,
      confidence: 'low',
    };
  }

  /**
   * Parse RAML header information from the first few lines
   */
  parseRamlHeader(lines: string[]): {
    title?: string;
    version?: string;
    description?: string;
  } {
    const header: { title?: string; version?: string; description?: string } =
      {};

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();

      if (line.startsWith('title:')) {
        header.title = line.substring(6).trim();
      } else if (line.startsWith('version:')) {
        header.version = line.substring(8).trim();
      } else if (line.startsWith('description:')) {
        header.description = line.substring(12).trim();
      }

      // Stop parsing header once we hit 'types:' section
      if (line === 'types:') {
        break;
      }
    }

    return header;
  }

  toPascalCase(str: string) {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1).replace(/[_-]([a-z])/g, (_, letter) => letter.toUpperCase())
    );
  }

  convertToJsonSchema(type: RamlType) {
    if (type.isEnum) {
      const schema: any = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: type.name,
        type: 'string',
        enum: type.enumValues,
      };
      if (type.isInlineEnum) {
        schema.description = type.description;
      }
      return schema;
    }
    const schema: any = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: type.name,
      type: 'object',
      properties: {},
      additionalProperties: false,
    };
    for (const [propName, propDef] of Object.entries(type.properties)) {
      if (propDef.$ref) {
        schema.properties[propName] = { $ref: propDef.$ref };
      } else if (propDef.type === 'array' && propDef.items) {
        schema.properties[propName] = {
          type: 'array',
          items: propDef.items.$ref
            ? { $ref: propDef.items.$ref }
            : { type: propDef.items.type },
        };
      } else if (propDef.type === 'any' || propDef.originalType === 'any') {
        schema.properties[propName] = {
          type: true,
        };
      } else if (Array.isArray(propDef.type)) {
        // Handle union types as array
        schema.properties[propName] = {
          type: propDef.type,
        };
      } else if (propDef.type) {
        const propSchema: any = { type: propDef.type };
        if (propDef.originalType === 'date-only') {
          propSchema.format = 'date';
        } else if (propDef.originalType === 'datetime') {
          propSchema.format = 'date-time';
        } else if (propDef.originalType === 'time') {
          propSchema.format = 'time';
        } else if (propDef.originalType === 'time-only') {
          propSchema.format = 'time';
        } else if (propDef.originalType === 'datetime-only') {
          propSchema.format = 'date-time';
        } else if (propDef.originalType === 'datetime-with-timezone') {
          propSchema.format = 'date-time';
        } else if (propDef.format) {
          propSchema.format = propDef.format;
        }
        // Heuristic: if property name contains 'email' and the type is string, set format to email
        if (
          typeof propSchema.type === 'string' &&
          propSchema.type === 'string' &&
          !propSchema.format &&
          /email/i.test(propName)
        ) {
          propSchema.format = 'email';
        }
        schema.properties[propName] = propSchema;
      }
    }
    if (type.required.length > 0) {
      schema.required = type.required;
    }
    return schema;
  }
}

export async function convertRamlToJsonSchemas(
  ramlDir: string,
  outputDir: string,
  options?: { namingConvention?: NamingConvention },
) {
  const convention: NamingConvention = options?.namingConvention ?? 'camelCase';
  const parser = new SimpleRamlParser(convention);
  const enumTypes = new Map<string, any>();
  const payloadTypes = new Map<string, any>();
  const SCHEMAS_ROOT = outputDir;
  const OUTPUT_BUSINESS_OBJECTS = path.join(SCHEMAS_ROOT, 'business-objects');
  const OUTPUT_COMMON = path.join(SCHEMAS_ROOT, 'common');
  const OUTPUT_ENUMS = path.join(OUTPUT_COMMON, 'enums');
  const DATAMODEL_OBJECTS_FILE = path.join(
    SCHEMAS_ROOT,
    'datamodelObjects.schema.json',
  );
  const MESSAGE_SCHEMA_FILE = path.join(SCHEMAS_ROOT, 'message.schema.json');
  const METADATA_SCHEMA_FILE = path.join(SCHEMAS_ROOT, 'metadata.schema.json');

  // Ensure all directories exist
  await fsExtra.ensureDir(SCHEMAS_ROOT);
  await fsExtra.ensureDir(OUTPUT_BUSINESS_OBJECTS);
  await fsExtra.ensureDir(OUTPUT_COMMON);
  await fsExtra.ensureDir(OUTPUT_ENUMS);

  // Write message.schema.json
  await fs.writeFile(
    MESSAGE_SCHEMA_FILE,
    JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Berichten',
        type: 'object',
        properties: {
          metadata: { $ref: './metadata.schema.json' },
          payload: {
            oneOf: [
              { $ref: './datamodelObjects.schema.json' },
              {
                type: 'array',
                items: { $ref: './datamodelObjects.schema.json' },
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['metadata', 'payload'],
        additionalProperties: false,
      },
      null,
      2,
    ),
  );

  // Write metadata.schema.json
  await fs.writeFile(
    METADATA_SCHEMA_FILE,
    JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Metadata',
        type: 'object',
        properties: {
          berichtId: { type: 'string', description: 'Uniek bericht ID' },
          tijdstip: { type: 'string', format: 'date-time' },
          bronsysteem: { type: 'string' },
          correlatieId: { type: 'string' },
        },
        required: ['berichtId', 'tijdstip', 'bronsysteem'],
        additionalProperties: false,
      },
      null,
      2,
    ),
  );

  // Find all RAML files
  const files = await fs.readdir(ramlDir);
  const ramlFiles = files.filter(
    (f: string) => f.endsWith('.raml') && f !== 'cdm.raml',
  );
  // Also process enum files
  const enumDir = path.join(ramlDir, 'enums');
  let enumRamlFiles: string[] = [];
  if (await fsExtra.pathExists(enumDir)) {
    enumRamlFiles = (await fs.readdir(enumDir)).filter((f: string) =>
      f.endsWith('.raml'),
    );
  }
  const allFiles = [...ramlFiles, ...enumRamlFiles.map((f) => `enums/${f}`)];
  const fileReports: ConversionReport[] = [];
  for (const file of allFiles) {
    const filePath = path.join(ramlDir, file);
    try {
      const start = Date.now();
      const collector: FileReportCollector = {
        filePath,
        enumsWritten: [],
        businessObjectsWritten: [],
        inferredFormats: new Set<string>(),
        unions: [],
        inlineEnums: [],
        dedupedEnums: [],
        namingChanges: [],
        propertyTransformations: [],
        formatInferences: [],
        generatedSchemas: [],
      };
      const types = await parser.parseFile(filePath, collector);
      for (const type of types) {
        const schema = parser.convertToJsonSchema(type);
        if (type.isEnum) {
          enumTypes.set(type.name, schema);
        } else {
          payloadTypes.set(type.name, schema);
        }
      }
      // Pre-fill enums/BOs, naming changes, and generated schemas for this file
      for (const type of types) {
        const base = applyNamingConvention(type.name, convention);
        const out = type.isEnum
          ? path.join(OUTPUT_ENUMS, `${base}Enum.schema.json`)
          : path.join(OUTPUT_BUSINESS_OBJECTS, `${base}.schema.json`);

        // Get the generated schema
        const schema = parser.convertToJsonSchema(type);
        const schemaContent = JSON.stringify(schema, null, 2);
        const fileName = type.isEnum
          ? `${base}Enum.schema.json`
          : `${base}.schema.json`;

        // Store the generated schema content
        collector.generatedSchemas.push({
          fileName,
          content: schemaContent,
          type: type.isEnum ? 'enum' : 'business-object',
        });

        if (type.isEnum) {
          collector.enumsWritten.push({ name: type.name, file: out });
          if (base !== type.name) {
            collector.namingChanges.push({
              from: type.name,
              to: base,
              scope: 'enum',
            });
          }
        } else {
          collector.businessObjectsWritten.push({ name: type.name, file: out });
          if (base !== type.name) {
            collector.namingChanges.push({
              from: type.name,
              to: base,
              scope: 'type',
            });
          }
        }
      }

      // Debug logging before creating report
      logger.debug('Creating file report', {
        filePath,
        propertyTransformationsCount: collector.propertyTransformations.length,
        unionConversionsCount: collector.unions.length,
        formatInferencesCount: collector.formatInferences.length,
        namingChangesCount: collector.namingChanges.length,
        inlineEnumsCount: collector.inlineEnums.length,
      });

      fileReports.push({
        inputFile: filePath,
        enumsWritten: collector.enumsWritten,
        businessObjectsWritten: collector.businessObjectsWritten,
        inferredFormats: Array.from(collector.inferredFormats),
        unionsCount: collector.unions.length,
        inlineEnumsExtracted: collector.inlineEnums.map((x) => x.newEnumName),
        dedupedEnums: collector.dedupedEnums,
        warnings: [],
        errors: [],
        durationMs: Date.now() - start,
        $idTargets: [],
        // Enhanced data for detailed transformation analysis
        fileMapping: {
          inputFile: filePath,
          ...(collector.inputSize !== undefined && {
            inputSize: collector.inputSize,
          }),
          ...(collector.ramlHeader !== undefined && {
            ramlHeader: collector.ramlHeader,
          }),
          outputFiles: [
            ...collector.enumsWritten.map((e) => {
              const fileInfo: any = {
                file: e.file || 'unknown',
                type: 'enum' as const,
                name: e.name,
              };
              if (e.size !== undefined) fileInfo.size = e.size;
              if (e.$id !== undefined) fileInfo.$id = e.$id;
              return fileInfo;
            }),
            ...collector.businessObjectsWritten.map((b) => {
              const fileInfo: any = {
                file: b.file || 'unknown',
                type: 'business-object' as const,
                name: b.name,
              };
              if (b.size !== undefined) fileInfo.size = b.size;
              if (b.$id !== undefined) fileInfo.$id = b.$id;
              return fileInfo;
            }),
          ],
        },
        propertyTransformations: collector.propertyTransformations,
        unionConversions: collector.unions.map((u) => {
          const conversion: any = {
            parentType: u.parentType,
            property: u.property,
            original: u.original,
            converted: u.converted,
            strategy: u.strategy,
          };
          if (u.lineNumber !== undefined) conversion.lineNumber = u.lineNumber;
          return conversion;
        }),
        inlineEnumExtractions: collector.inlineEnums.map((ie) => {
          const extraction: any = {
            parentType: ie.parentType,
            property: ie.property,
            newEnumName: ie.newEnumName,
            file: ie.file || 'unknown',
            values: ie.values,
          };
          if (ie.lineRange !== undefined) extraction.lineRange = ie.lineRange;
          return extraction;
        }),
        namingChanges: collector.namingChanges.map((nc) => {
          const change: any = {
            original: nc.from,
            converted: nc.to,
            scope: nc.scope,
          };
          if (nc.context !== undefined) change.context = nc.context;
          return change;
        }),
        formatInferences: collector.formatInferences,
        // Source code comparison data
        ...(collector.originalRamlContent && {
          originalRamlContent: collector.originalRamlContent,
        }),
        generatedSchemas: collector.generatedSchemas,
      });
    } catch {
      // Skip file on error
      continue;
    }
  }
  // Write enums
  for (const [name, schema] of enumTypes) {
    const base = applyNamingConvention(name, convention);
    const filename = `${base}Enum.schema.json`;
    await fs.writeFile(
      path.join(OUTPUT_ENUMS, filename),
      JSON.stringify(schema, null, 2),
    );
  }
  // Write business objects (formerly payloads)
  for (const [name, schema] of payloadTypes) {
    const base = applyNamingConvention(name, convention);
    const filename = `${base}.schema.json`;
    await fs.writeFile(
      path.join(OUTPUT_BUSINESS_OBJECTS, filename),
      JSON.stringify(schema, null, 2),
    );
  }
  // Update datamodelObjects.schema.json
  const datamodelObjects: any = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Datamodel Objecten',
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };
  for (const [name] of payloadTypes) {
    const propKey = applyNamingConvention(name, 'PascalCase');
    const base = applyNamingConvention(name, convention);
    datamodelObjects.properties[propKey] = {
      $ref: `./business-objects/${base}.schema.json`,
    };
  }
  await fs.writeFile(
    DATAMODEL_OBJECTS_FILE,
    JSON.stringify(datamodelObjects, null, 2),
  );
  // Aggregate data from detailed reports
  const totalUnions = fileReports.reduce(
    (sum, report) => sum + (report.unionsCount || 0),
    0,
  );
  const totalInlineEnums = fileReports.reduce(
    (sum, report) => sum + (report.inlineEnumsExtracted?.length || 0),
    0,
  );
  const totalWarnings = fileReports.reduce(
    (sum, report) => sum + (report.warnings?.length || 0),
    0,
  );
  const totalErrors = fileReports.reduce(
    (sum, report) => sum + (report.errors?.length || 0),
    0,
  );
  const totalDuration = fileReports.reduce(
    (sum, report) => sum + (report.durationMs || 0),
    0,
  );

  const summary: ConversionSummary = {
    filesProcessed: allFiles.length,
    enumsCreated: Array.from(enumTypes.keys()).length,
    businessObjectsCreated: Array.from(payloadTypes.keys()).length,
    unionsCount: totalUnions,
    inlineEnumsExtracted: totalInlineEnums,
    dedupedEnums: 0, // TODO: Implement deduplication tracking
    warningsCount: totalWarnings,
    errorsCount: totalErrors,
    durationMs: totalDuration,
    outputDirectory: SCHEMAS_ROOT,
  };
  return {
    enums: Array.from(enumTypes.keys()),
    payloads: Array.from(payloadTypes.keys()),
    outputDir: SCHEMAS_ROOT,
    reports: fileReports,
    summary,
  };
}

/**
 * RAML to JSON Schema converter service.
 */
export class RamlConverter {
  private static instance: RamlConverter;

  /**
   * Get singleton instance.
   */
  public static getInstance(): RamlConverter {
    if (!RamlConverter.instance) {
      RamlConverter.instance = new RamlConverter();
    }
    return RamlConverter.instance;
  }

  /**
   * Convert a single RAML file to JSON Schema.
   */
  public async convertFile(
    sourcePath: string,
    destinationPath: string,
    options: ConversionOptions,
  ): Promise<ConversionResult> {
    try {
      logger.info('RamlConverter: Starting file conversion', {
        sourcePath,
        destinationPath,
        options,
      });

      // Use the new SimpleRamlParser for conversion
      const parser = new SimpleRamlParser();
      const types = await parser.parseFile(sourcePath);

      if (types.length === 0) {
        return {
          success: false,
          inputFile: sourcePath,
          outputFile: destinationPath,
          error: 'No types found in RAML file',
        };
      }

      // Convert each type to JSON Schema
      const schemas: any[] = [];
      for (const type of types) {
        const schema = parser.convertToJsonSchema(type);
        schemas.push(schema);
      }

      // Apply naming convention
      const outputFileName = this.applyNamingConvention(
        path.basename(sourcePath, '.raml'),
        options.namingConvention,
      );

      const outputPath = path.join(destinationPath, `${outputFileName}.json`);

      // Write JSON Schema to file
      const outputSchema =
        schemas.length === 1
          ? schemas[0]
          : {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              title: path.basename(sourcePath, '.raml'),
              type: 'object',
              properties: {},
              definitions: {},
            };

      if (schemas.length > 1) {
        // Add all schemas as definitions
        for (let i = 0; i < schemas.length; i++) {
          const schema = schemas[i];
          if (schema.title) {
            outputSchema.definitions[schema.title] = schema;
          }
        }
      }

      await fs.writeFile(
        outputPath,
        JSON.stringify(outputSchema, null, 2),
        'utf-8',
      );

      logger.info('RamlConverter: File conversion completed successfully', {
        sourcePath,
        outputPath,
      });

      return {
        success: true,
        inputFile: sourcePath,
        outputFile: outputPath,
        schema: outputSchema,
      };
    } catch (error) {
      logger.error('RamlConverter: File conversion failed', {
        sourcePath,
        destinationPath,
        error,
      });

      return {
        success: false,
        inputFile: sourcePath,
        outputFile: destinationPath,
        error:
          error instanceof Error ? error.message : 'Unknown conversion error',
      };
    }
  }

  /**
   * Convert multiple RAML files in batch.
   */
  public async convertBatch(
    sourceDirectory: string,
    destinationDirectory: string,
    options: ConversionOptions,
    progressCallback?: (progress: {
      current: number;
      total: number;
      currentFile: string;
      phase: string;
    }) => void,
  ): Promise<{
    success: boolean;
    results: ConversionResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      warnings: number;
    };
  }> {
    try {
      logger.info('RamlConverter: Starting batch conversion', {
        sourceDirectory,
        destinationDirectory,
        options,
      });

      // Find all RAML files
      const ramlFiles = await glob('**/*.raml', {
        cwd: sourceDirectory,
        absolute: true,
      });

      if (ramlFiles.length === 0) {
        return {
          success: true,
          results: [],
          summary: { total: 0, successful: 0, failed: 0, warnings: 0 },
        };
      }

      // Ensure destination directory exists
      await fs.mkdir(destinationDirectory, { recursive: true });

      const results: ConversionResult[] = [];
      let successful = 0;
      let failed = 0;
      let warnings = 0;

      // Convert each file
      for (let i = 0; i < ramlFiles.length; i++) {
        const filePath = ramlFiles[i];
        const fileName = path.basename(filePath);

        progressCallback?.({
          current: i + 1,
          total: ramlFiles.length,
          currentFile: fileName,
          phase: 'converting',
        });

        const result = await this.convertFile(
          filePath,
          destinationDirectory,
          options,
        );
        results.push(result);

        if (result.success) {
          successful++;
          if (result.warnings && result.warnings.length > 0) {
            warnings++;
          }
        } else {
          failed++;
        }
      }

      const summary = {
        total: ramlFiles.length,
        successful,
        failed,
        warnings,
      };

      logger.info('RamlConverter: Batch conversion completed', {
        sourceDirectory,
        destinationDirectory,
        summary,
      });

      return {
        success: failed === 0,
        results,
        summary,
      };
    } catch (error) {
      logger.error('RamlConverter: Batch conversion failed', {
        sourceDirectory,
        destinationDirectory,
        error,
      });

      throw error;
    }
  }

  /**
   * Apply naming convention to filename.
   */
  private applyNamingConvention(
    name: string,
    convention: ConversionOptions['namingConvention'],
  ): string {
    switch (convention) {
      case 'kebab-case':
        return name.toLowerCase().replace(/[_\s]+/g, '-');
      case 'camelCase':
        return name.replace(/[-_\s]+(.)?/g, (_, char) =>
          char ? char.toUpperCase() : '',
        );
      case 'PascalCase':
        return name
          .replace(/[-_\s]+(.)?/g, (_, char) =>
            char ? char.toUpperCase() : '',
          )
          .replace(/^./, (char) => char.toUpperCase());
      case 'snake_case':
        return name.toLowerCase().replace(/[-\s]+/g, '_');
      default:
        return name;
    }
  }
}

// Export singleton instance
export const ramlConverter = RamlConverter.getInstance();

// Legacy interfaces for backward compatibility
interface ConversionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  schema?: any;
  error?: string;
  warnings?: string[];
}

interface ConversionOptions {
  preserveStructure: boolean;
  generateExamples: boolean;
  includeAnnotations: boolean;
  namingConvention: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';
  validateOutput: boolean;
}
