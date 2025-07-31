/**
 * Schema detail modal component for JSON Schema Editor.
 *
 * This component displays detailed information about a schema including
 * overview, content, properties, and validation details. It supports
 * modal navigation for exploring schema references.
 *
 * @module SchemaDetailModal
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Clock, Calendar, Copy } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { toast } from 'sonner';
import type { Schema, ValidationStatus, SchemaReference } from '../../../types/schema-editor';
import type { SchemaDetailModal as SchemaDetailModalType } from '../../stores/useAppStore';
import logger from '@/lib/renderer-logger';

/**
 * Schema detail modal props.
 */
interface SchemaDetailModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function called when modal is closed */
  onClose: () => void;
  /** Function called when edit button is clicked */
  onEdit: (schema: Schema) => void;
}

/**
 * Schema detail modal component.
 *
 * This component provides:
 * - Overview tab with basic schema information
 * - Content tab with JSON viewer
 * - Properties tab with schema properties and references
 * - Validation tab with detailed error information
 * - Modal navigation with back/forward support
 *
 * @param props - Component props
 * @returns JSX element representing the schema detail modal
 *
 * @example
 * ```tsx
 * <SchemaDetailModal
 *   isOpen={isModalOpen}
 *   onClose={handleClose}
 *   onEdit={handleEdit}
 * />
 * ```
 */
export function SchemaDetailModal({
  isOpen,
  onClose,
  onEdit,
}: SchemaDetailModalProps): React.JSX.Element {
  const {
    modalStack,
    currentModalIndex,
    currentProject,
    navigateToSchema,
    goBack,
    setActiveModalTab,
  } = useAppStore();

  // Use schemas from current project, not the empty schemas array from store
  const schemas = currentProject?.schemas || [];

  const currentModal = modalStack[currentModalIndex];
  const canGoBack = currentModalIndex > 0;

  /**
   * Handles copying schema content to clipboard.
   */
  const handleCopyContent = async () => {
    if (!currentModal) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(currentModal.schema.content, null, 2));
      toast.success('Schema content copied to clipboard');
    } catch (_error) {
      toast.error('Failed to copy schema content');
    }
  };

  /**
   * Gets validation status display information.
   */
  const getValidationStatus = (status: ValidationStatus) => {
    switch (status) {
      case 'valid':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Valid',
          variant: 'default' as const,
          description: 'This schema is valid and follows JSON Schema specification.',
        };
      case 'invalid':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Invalid',
          variant: 'destructive' as const,
          description: 'This schema has validation errors that need to be fixed.',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Error',
          variant: 'destructive' as const,
          description: 'An error occurred during validation.',
        };
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          text: 'Pending',
          variant: 'secondary' as const,
          description: 'This schema is waiting to be validated.',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          text: 'Unknown',
          variant: 'secondary' as const,
          description: 'Validation status is unknown.',
        };
    }
  };

  /**
   * Formats file size in human-readable format.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  /**
   * Formats a relative date for display.
   */
  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  /**
   * Gets the display type for a schema property.
   */
  const getPropertyType = (property: unknown): string => {
    if (typeof property !== 'object' || property === null) return 'any';

    const prop = property as Record<string, unknown>;

    // Check for enum
    if (prop.enum && Array.isArray(prop.enum)) {
      return 'Enum';
    }

    // Check for type
    if (prop.type && typeof prop.type === 'string') {
      return prop.type;
    }

    // Check for $ref
    if (prop.$ref && typeof prop.$ref === 'string') {
      return 'Reference';
    }

    // Check for oneOf, anyOf, allOf
    if (prop.oneOf || prop.anyOf || prop.allOf) {
      return 'Union';
    }

    return 'any';
  };

  /**
   * Handles clicking on a reference to navigate to that schema.
   */
  const handleReferenceClick = (reference: SchemaReference) => {
    logger.info('SchemaDetailModal: Handling reference click', {
      reference,
      availableSchemas: schemas.map((s) => ({
        name: s.name,
        relativePath: s.relativePath,
        id: s.id,
      })),
    });

    // Try multiple matching strategies
    let referencedSchema = schemas.find((schema) => schema.name === reference.schemaName);

    if (!referencedSchema) {
      // Try matching by relative path containing the schema name
      referencedSchema = schemas.find((schema) =>
        schema.relativePath.includes(reference.schemaName),
      );
    }

    if (!referencedSchema) {
      // Try matching by filename without extension
      const schemaNameWithoutExt = reference.schemaName.replace(/\.(json|schema)$/, '');
      referencedSchema = schemas.find((schema) => {
        const schemaNameWithoutExt2 = schema.name.replace(/\.(json|schema)$/, '');
        return schemaNameWithoutExt2 === schemaNameWithoutExt;
      });
    }

    if (!referencedSchema) {
      // Try matching by path basename
      referencedSchema = schemas.find((schema) => {
        const basename = schema.relativePath
          .split('/')
          .pop()
          ?.replace(/\.(json|schema)$/, '');
        return (
          basename === reference.schemaName ||
          basename === reference.schemaName.replace(/\.(json|schema)$/, '')
        );
      });
    }

    logger.info('SchemaDetailModal: Reference click result', {
      reference,
      found: !!referencedSchema,
      foundSchema: referencedSchema
        ? { name: referencedSchema.name, id: referencedSchema.id }
        : null,
    });

    if (referencedSchema) {
      navigateToSchema(referencedSchema, 'overview');
    } else {
      toast.error(`Referenced schema not found: ${reference.schemaName}`);
      logger.warn('SchemaDetailModal: Could not find referenced schema', {
        searchedFor: reference.schemaName,
        availableNames: schemas.map((s) => s.name),
      });
    }
  };

  if (!currentModal) {
    return null;
  }

  const { schema, activeTab } = currentModal;
  const validationStatus = getValidationStatus(schema.validationStatus);
  const fileSize = formatFileSize(schema.metadata.fileSize);
  const lastModified = formatRelativeDate(schema.metadata.lastModified);

  // Extract references and get schemas that reference this one
  const references = schema.references;
  const referencedBy = schema.referencedBy
    ? schemas.filter((s) => schema.referencedBy.includes(s.id))
    : [];

  // Comprehensive debug logging
  logger.info('SchemaDetailModal: Reference data', {
    schemaName: schema.name,
    schemaId: schema.id,
    referencesCount: references.length,
    referencedByCount: referencedBy.length,
    references: references,
    referencedByIds: schema.referencedBy,
    // Debug: Show all schema IDs for comparison
    allSchemaIds: schemas.map((s) => ({ name: s.name, id: s.id })),
    // Debug: Check if any referencedBy IDs exist in schemas
    referencedByMatches:
      schema.referencedBy?.map((refId) => ({
        refId,
        found: schemas.find((s) => s.id === refId),
        foundName: schemas.find((s) => s.id === refId)?.name,
      })) || [],
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" className="max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canGoBack && (
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <div>
                  <DialogTitle>{schema.metadata.title || schema.name}</DialogTitle>
                  <DialogDescription>
                    View detailed information about this JSON Schema including properties, validation, and references.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={validationStatus.variant} className="flex items-center gap-1">
                {validationStatus.icon}
                {validationStatus.text}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveModalTab(value as SchemaDetailModalType['activeTab'])
            }
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>

            <div className="mt-4 h-[calc(95vh-200px)] overflow-hidden">
              <TabsContent value="overview" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Schema Information</CardTitle>
                        <CardDescription>Basic details about this schema</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Name
                            </label>
                            <p className="text-sm">{schema.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Path
                            </label>
                            <p className="text-xs font-mono">{schema.relativePath}</p>
                          </div>
                          {schema.metadata.title && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Title
                              </label>
                              <p className="text-sm">{schema.metadata.title}</p>
                            </div>
                          )}
                          {schema.metadata.description && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Description
                              </label>
                              <p className="text-sm">{schema.metadata.description}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Metadata */}
                    <Card>
                      <CardHeader>
                        <CardTitle>File Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{lastModified}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{fileSize}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button onClick={() => onEdit(schema)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Edit Schema
                          </Button>
                          <Button variant="outline" onClick={handleCopyContent}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Content
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="content" className="h-full">
                <ScrollArea className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Schema Content</CardTitle>
                      <CardDescription>JSON content of the schema</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-auto max-h-[500px]">
                          <code>{JSON.stringify(schema.content, null, 2)}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="properties" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Schema Properties</CardTitle>
                        <CardDescription>Properties and structure of this schema</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Schema Type */}
                          <div>
                            <h4 className="font-medium mb-2">Schema Type</h4>
                            <Badge variant="outline">
                              {(schema.content.type as string) || 'object'}
                            </Badge>
                          </div>

                          {/* Root-level Enum Values */}
                          {schema.content.enum && Array.isArray(schema.content.enum) && (
                            <div>
                              <h4 className="font-medium mb-2">Enum Values</h4>
                              <div className="flex flex-wrap gap-1">
                                {(schema.content.enum as unknown[]).map((enumValue, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {String(enumValue)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Properties */}
                          {schema.content.properties && (
                            <div>
                              <h4 className="font-medium mb-2">Properties</h4>
                              <div className="space-y-2">
                                {Object.entries(
                                  schema.content.properties as Record<string, unknown>,
                                ).map(([key, value]) => {
                                  const prop = value as Record<string, unknown>;
                                  const isEnum = prop.enum && Array.isArray(prop.enum);
                                  const enumValues = isEnum ? (prop.enum as unknown[]) : [];
                                  const propertyType = getPropertyType(value);
                                  const displayType = isEnum
                                    ? `${prop.type || 'string'} enum`
                                    : propertyType;

                                  return (
                                    <div key={key} className="space-y-2">
                                      <div className="flex items-center justify-between p-2 border rounded">
                                        <span className="font-mono text-sm">{key}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {displayType}
                                        </Badge>
                                      </div>
                                      {isEnum && enumValues.length > 0 && (
                                        <div className="ml-4 p-2 bg-muted/50 rounded">
                                          <p className="text-xs text-muted-foreground mb-1">
                                            Enum values:
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {enumValues.map((enumValue, index) => (
                                              <Badge
                                                key={index}
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {String(enumValue)}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Required Fields */}
                          {schema.content.required && Array.isArray(schema.content.required) && (
                            <div>
                              <h4 className="font-medium mb-2">Required Fields</h4>
                              <div className="flex flex-wrap gap-1">
                                {(schema.content.required as string[]).map((field) => (
                                  <Badge key={field} variant="destructive" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* References */}
                          {references.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">References</h4>
                              <div className="space-y-1">
                                {references.map((ref, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent"
                                    onClick={() => handleReferenceClick(ref)}
                                  >
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {schemas.find((s) => s.name === ref.schemaName)?.metadata
                                        .title || ref.schemaName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Referenced By */}
                          {referencedBy.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Referenced By</h4>
                              <div className="space-y-1">
                                {referencedBy.map((schema) => (
                                  <div
                                    key={schema.id}
                                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent"
                                    onClick={() => navigateToSchema(schema, 'overview')}
                                  >
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {schema.metadata.title || schema.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {references.length === 0 && referencedBy.length === 0 && (
                            <div className="text-sm text-muted-foreground">No references found</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="validation" className="h-full">
                <ScrollArea className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Validation Details</CardTitle>
                      <CardDescription>{validationStatus.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          {validationStatus.icon}
                          <span className="font-medium">{validationStatus.text}</span>
                        </div>

                        {/* Show actual validation errors */}
                        {schema.validationStatus === 'invalid' &&
                          schema.validationErrors &&
                          schema.validationErrors.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <h4 className="font-medium text-destructive">Validation Errors:</h4>
                              {schema.validationErrors.map((error, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-destructive/10 border border-destructive/20 rounded"
                                >
                                  <p className="text-sm text-destructive font-medium">
                                    {error.instancePath
                                      ? `Path: ${error.instancePath}`
                                      : 'Schema Error'}
                                  </p>
                                  <p className="text-sm text-destructive mt-1">{error.message}</p>
                                  {error.keyword && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Keyword: {error.keyword}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Fallback for invalid schemas without specific errors */}
                        {schema.validationStatus === 'invalid' &&
                          (!schema.validationErrors || schema.validationErrors.length === 0) && (
                            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
                              <p className="text-sm text-destructive">
                                This schema contains validation errors. Check the schema content for
                                issues.
                              </p>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
