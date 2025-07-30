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
import * as path from 'path';
import { glob } from 'glob';
import logger from './main-logger';

/**
 * RAML file information interface.
 */
interface RamlFile {
  path: string;
  name: string;
  content: string;
  metadata: {
    title?: string;
    version?: string;
    description?: string;
    baseUri?: string;
  };
}

/**
 * JSON Schema output interface.
 */
interface JsonSchema {
  $schema?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  definitions?: Record<string, JsonSchemaProperty>;
  type?: string;
  items?: JsonSchemaProperty;
  additionalProperties?: boolean | JsonSchemaProperty;
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: unknown;
}

interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  required?: string[];
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JsonSchemaProperty;
  [key: string]: unknown;
}

interface RamlTypeDefinition {
  name: string;
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  isDefinition: boolean;
  description?: string;
}

/**
 * Conversion result interface.
 */
interface ConversionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  schema?: JsonSchema;
  error?: string;
  warnings?: string[];
}

/**
 * Conversion options interface.
 */
interface ConversionOptions {
  preserveStructure: boolean;
  generateExamples: boolean;
  includeAnnotations: boolean;
  namingConvention: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';
  validateOutput: boolean;
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

      // Read and parse RAML file
      const ramlFile = await this.parseRamlFile(sourcePath);

      // Convert to JSON Schema
      const schema = await this.convertRamlToJsonSchema(ramlFile, options);

      // Apply naming convention
      const outputFileName = this.applyNamingConvention(
        path.basename(sourcePath, '.raml'),
        options.namingConvention,
      );

      const outputPath = path.join(destinationPath, `${outputFileName}.json`);

      // Validate output if requested
      if (options.validateOutput) {
        const validationResult = this.validateJsonSchema(schema);
        if (!validationResult.isValid) {
          return {
            success: false,
            inputFile: sourcePath,
            outputFile: outputPath,
            error: `Generated schema is invalid: ${validationResult.errors.join(', ')}`,
          };
        }
      }

      // Write JSON Schema to file
      await fs.writeFile(outputPath, JSON.stringify(schema, null, 2), 'utf-8');

      logger.info('RamlConverter: File conversion completed successfully', {
        sourcePath,
        outputPath,
      });

      return {
        success: true,
        inputFile: sourcePath,
        outputFile: outputPath,
        schema,
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
        error: error instanceof Error ? error.message : 'Unknown conversion error',
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

        const result = await this.convertFile(filePath, destinationDirectory, options);
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
   * Parse a RAML file and extract metadata.
   */
  private async parseRamlFile(filePath: string): Promise<RamlFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const metadata: RamlFile['metadata'] = {};

    // Extract basic metadata from RAML header
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('title:')) {
        metadata.title = trimmed.replace('title:', '').trim();
      } else if (trimmed.startsWith('version:')) {
        metadata.version = trimmed.replace('version:', '').trim();
      } else if (trimmed.startsWith('description:')) {
        metadata.description = trimmed.replace('description:', '').trim();
      } else if (trimmed.startsWith('baseUri:')) {
        metadata.baseUri = trimmed.replace('baseUri:', '').trim();
      }
    }

    return {
      path: filePath,
      name: path.basename(filePath),
      content,
      metadata,
    };
  }

  /**
   * Convert RAML structure to JSON Schema.
   */
  private async convertRamlToJsonSchema(
    ramlFile: RamlFile,
    options: ConversionOptions,
  ): Promise<JsonSchema> {
    // Basic JSON Schema structure
    const schema: JsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: ramlFile.metadata.title || path.basename(ramlFile.name, '.raml'),
      ...(ramlFile.metadata.description && { description: ramlFile.metadata.description }),
    };

    // Parse RAML content and extract types/schemas
    const types = this.extractRamlTypes(ramlFile.content);

    if (types.length > 0) {
      schema.properties = {};
      schema.definitions = {};

      for (const type of types) {
        const jsonSchemaType = this.convertRamlTypeToJsonSchema(type, options);

        if (type.isDefinition) {
          schema.definitions[type.name] = jsonSchemaType;
        } else {
          schema.properties[type.name] = jsonSchemaType;
        }
      }
    }

    // Add examples if requested
    if (options.generateExamples && schema.properties) {
      schema.examples = [this.generateExampleFromSchema(schema)];
    }

    return schema;
  }

  /**
   * Extract type definitions from RAML content.
   */
  private extractRamlTypes(content: string): Array<RamlTypeDefinition> {
    const types: Array<RamlTypeDefinition> = [];

    const lines = content.split('\n');
    let currentType: RamlTypeDefinition | null = null;
    let inTypesSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if we're in the types section
      if (trimmed === 'types:') {
        inTypesSection = true;
        continue;
      }

      // If we're in types section and find a type definition
      if (inTypesSection && trimmed.match(/^[a-zA-Z][a-zA-Z0-9]*:$/)) {
        // Save previous type if exists
        if (currentType) {
          types.push(currentType);
        }

        // Start new type
        const typeName = trimmed.replace(':', '');
        currentType = {
          name: typeName,
          type: 'object',
          properties: {},
          isDefinition: true,
        };
      }

      // Extract properties for current type
      if (currentType && currentType.properties && line.match(/^\s{2,}[a-zA-Z][a-zA-Z0-9]*:/)) {
        const propMatch = line.match(/^\s+([a-zA-Z][a-zA-Z0-9]*):(.*)$/);
        if (propMatch) {
          const propName = propMatch[1];
          const propType = propMatch[2].trim();

          currentType.properties[propName] = this.parseRamlPropertyType(propType);
        }
      }
    }

    // Add the last type
    if (currentType) {
      types.push(currentType);
    }

    return types;
  }

  /**
   * Convert RAML type to JSON Schema type.
   */
  private convertRamlTypeToJsonSchema(
    ramlType: {
      name: string;
      type: string;
      properties?: Record<string, JsonSchemaProperty>;
      description?: string;
    },
    _options: ConversionOptions,
  ): JsonSchemaProperty {
    const jsonSchemaType: JsonSchemaProperty = {
      type: 'object',
      title: ramlType.name,
    };

    if (ramlType.description) {
      jsonSchemaType.description = ramlType.description;
    }

    if (ramlType.properties) {
      jsonSchemaType.properties = {};
      const required: string[] = [];

      for (const [propName, propDef] of Object.entries(ramlType.properties)) {
        jsonSchemaType.properties[propName] = propDef;

        // Mark as required if not optional
        if (propDef && typeof propDef === 'object' && !propDef.optional) {
          required.push(propName);
        }
      }

      if (required.length > 0) {
        jsonSchemaType.required = required;
      }
    }

    return jsonSchemaType;
  }

  /**
   * Parse RAML property type to JSON Schema property.
   */
  private parseRamlPropertyType(ramlType: string): JsonSchemaProperty {
    // Handle basic types
    if (ramlType.includes('string')) {
      return { type: 'string' };
    } else if (ramlType.includes('number') || ramlType.includes('integer')) {
      return { type: 'number' };
    } else if (ramlType.includes('boolean')) {
      return { type: 'boolean' };
    } else if (ramlType.includes('array')) {
      return { type: 'array', items: { type: 'string' } };
    } else if (ramlType.includes('object')) {
      return { type: 'object' };
    }

    // Default to string
    return { type: 'string' };
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
        return name.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
      case 'PascalCase':
        return name
          .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
          .replace(/^./, (char) => char.toUpperCase());
      case 'snake_case':
        return name.toLowerCase().replace(/[-\s]+/g, '_');
      default:
        return name;
    }
  }

  /**
   * Validate JSON Schema.
   */
  private validateJsonSchema(schema: JsonSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!schema.$schema) {
      errors.push('Missing $schema property');
    }

    if (!schema.type) {
      errors.push('Missing type property');
    }

    // Validate properties if they exist
    if (schema.properties) {
      for (const [propName, propDef] of Object.entries(schema.properties)) {
        if (!propDef || typeof propDef !== 'object') {
          errors.push(`Invalid property definition for '${propName}'`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate example data from schema.
   */
  private generateExampleFromSchema(schema: JsonSchema): Record<string, unknown> {
    const example: Record<string, unknown> = {};

    if (schema.properties) {
      for (const [propName, propDef] of Object.entries(schema.properties)) {
        if (propDef && typeof propDef === 'object') {
          switch (propDef.type) {
            case 'string':
              example[propName] = `example_${propName}`;
              break;
            case 'number':
              example[propName] = 42;
              break;
            case 'boolean':
              example[propName] = true;
              break;
            case 'array':
              example[propName] = ['example_item'];
              break;
            case 'object':
              example[propName] = {};
              break;
            default:
              example[propName] = null;
          }
        }
      }
    }

    return example;
  }
}

// Export singleton instance
export const ramlConverter = RamlConverter.getInstance();
