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
  async parseFile(filePath: string): Promise<RamlType[]> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
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

  parsePropertyDetails(
    lines: string[],
    startIndex: number,
    parentTypeName: string,
    propertyName: string,
    inlineEnums: RamlType[],
  ) {
    const details: any = {
      type: 'string',
      description: '',
      format: null,
      items: null,
      $ref: null,
    };
    let hasInlineEnum = false;
    let inlineEnumValues: string[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;
      if (indent <= 6 && trimmed.endsWith(':')) break;
      if (indent === 8) {
        if (trimmed.startsWith('description:')) {
          details.description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('type:')) {
          const typeValue = trimmed.substring(5).trim();
          if (typeValue.includes(' | ')) {
            const unionTypes = typeValue.split(' | ').map((t) => t.trim());
            // Handle union types as array of types
            details.type = unionTypes.map((type) => this.mapRamlType(type));
            details.originalType = typeValue;
          } else {
            details.type = this.mapRamlType(typeValue);
            details.$ref = this.getTypeReference(typeValue);
            details.originalType = typeValue;
          }
        } else if (trimmed === 'enum:') {
          hasInlineEnum = true;
          details.type = 'string';
        }
      }
      if (hasInlineEnum && indent === 10 && trimmed.startsWith('- ')) {
        const enumValue = trimmed.substring(2).trim().replace(/['"]/g, '');
        inlineEnumValues.push(enumValue);
      }
      if (indent === 8 && trimmed === 'items:') {
        for (let j = i + 1; j < lines.length; j++) {
          const itemLine = lines[j];
          const itemTrimmed = itemLine.trim();
          const itemIndent = itemLine.length - itemLine.trimStart().length;
          if (itemIndent === 10 && itemTrimmed.startsWith('type:')) {
            const itemType = itemTrimmed.substring(5).trim();
            details.items = {
              type: this.mapRamlType(itemType),
              $ref: this.getTypeReference(itemType),
            };
            break;
          }
          if (itemIndent <= 8) break;
        }
      }
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
      details.$ref = `../common/enums/${enumTypeName}Enum.schema.json`;
      details.type = null;
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
    let typeName = cleanType;
    let libraryName = null;
    if (cleanType.includes('.')) {
      const parts = cleanType.split('.');
      libraryName = parts[0];
      typeName = parts[1];
    }
    // Ensure referenced filenames start with a capital letter
    const cap = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    if (libraryName && libraryName.startsWith('enum')) {
      return `../common/enums/${cap}Enum.schema.json`;
    }
    return `./${cap}.schema.json`;
  }

  generateEnumName(parentTypeName: string, propertyName: string) {
    const pascalParent = this.toPascalCase(parentTypeName);
    const pascalProperty = this.toPascalCase(propertyName);
    return `${pascalParent}${pascalProperty}`;
  }

  toPascalCase(str: string) {
    return (
      str.charAt(0).toUpperCase() +
      str
        .slice(1)
        .replace(/[_-]([a-z])/g, (match, letter) => letter.toUpperCase())
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
          type: {},
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
) {
  const parser = new SimpleRamlParser();
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
  for (const file of allFiles) {
    const filePath = path.join(ramlDir, file);
    try {
      const types = await parser.parseFile(filePath);
      for (const type of types) {
        const schema = parser.convertToJsonSchema(type);
        if (type.isEnum) {
          enumTypes.set(type.name, schema);
        } else {
          payloadTypes.set(type.name, schema);
        }
      }
    } catch {
      // Skip file on error
      continue;
    }
  }
  // Write enums
  for (const [name, schema] of enumTypes) {
    const filename = `${name}Enum.schema.json`;
    await fs.writeFile(
      path.join(OUTPUT_ENUMS, filename),
      JSON.stringify(schema, null, 2),
    );
  }
  // Write business objects (formerly payloads)
  for (const [name, schema] of payloadTypes) {
    const filename = `${name}.schema.json`;
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
    const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1);
    datamodelObjects.properties[camelCaseName] = {
      $ref: `./business-objects/${name}.schema.json`,
    };
  }
  await fs.writeFile(
    DATAMODEL_OBJECTS_FILE,
    JSON.stringify(datamodelObjects, null, 2),
  );
  return {
    enums: Array.from(enumTypes.keys()),
    payloads: Array.from(payloadTypes.keys()),
    outputDir: SCHEMAS_ROOT,
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
