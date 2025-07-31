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

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Copy,
  XCircle,
  HelpCircle,
  Info,
  Code,
  List,
  Shield,
  Edit,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { toast } from 'sonner';
import type { Schema, SchemaReference, ValidationStatus } from '../../../types/schema-editor';

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
  const { currentProject, modalStack, currentModalIndex, navigateToSchema, goBack } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'properties' | 'validation'>(
    'overview',
  );

  // Get the current schema from the modal stack
  const currentModal = modalStack[currentModalIndex];
  const schema = currentModal?.schema;
  const canGoBack = currentModalIndex > 0;

  const handleReferenceClick = useCallback(
    (reference: SchemaReference) => {
      if (schema) {
        // Find the referenced schema in the current project
        const referencedSchema = currentProject?.schemas.find(
          (s) => s.name === reference.schemaName,
        );
        if (referencedSchema) {
          navigateToSchema(referencedSchema, 'overview');
        } else {
          toast.error(`Referenced schema not found: ${reference.schemaName}`);
        }
      }
    },
    [schema, currentProject, navigateToSchema],
  );

  const handleCopyContent = async () => {
    if (!schema) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(schema.content, null, 2));
      toast.success('Schema content copied to clipboard');
    } catch (_error) {
      toast.error('Failed to copy schema content');
    }
  };

  const getValidationStatus = (status: ValidationStatus) => {
    switch (status) {
      case 'valid':
        return {
          text: 'Valid',
          variant: 'default' as const,
          icon: <CheckCircle className="h-4 w-4" />,
        };
      case 'invalid':
        return {
          text: 'Invalid',
          variant: 'destructive' as const,
          icon: <XCircle className="h-4 w-4" />,
        };
      case 'pending':
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          icon: <Clock className="h-4 w-4" />,
        };
      case 'error':
        return {
          text: 'Error',
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-4 w-4" />,
        };
      default:
        return {
          text: 'Unknown',
          variant: 'outline' as const,
          icon: <HelpCircle className="h-4 w-4" />,
        };
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getPropertyType = (property: unknown): string => {
    if (typeof property === 'object' && property !== null) {
      if ('type' in property) {
        return String(property.type);
      }
      if ('$ref' in property) {
        return 'reference';
      }
      if ('enum' in property) {
        return 'enum';
      }
      if ('oneOf' in property || 'anyOf' in property || 'allOf' in property) {
        return 'union';
      }
      return 'object';
    }
    return typeof property;
  };

  if (!schema || !currentProject) {
    return null;
  }

  const validationStatus = getValidationStatus(schema.validationStatus);
  const lastModified = formatRelativeDate(schema.metadata.lastModified);
  const fileSize = formatFileSize(schema.metadata.fileSize);

  // Get references and referenced by from the schema
  const references = schema.references || [];
  const referencedBy = currentProject.schemas.filter((s) => s.referencedBy?.includes(schema.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" layout="flex" className="max-h-[95vh] overflow-hidden w-[900px]">
        <DialogHeader className="flex-shrink-0 pb-4">
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
                    View detailed information about this JSON Schema including properties,
                    validation, and references.
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

        <div className="flex-1 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'overview' | 'content' | 'properties' | 'validation')
            }
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <TabsContent value="overview" className="h-full mt-0">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Schema Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 h-[500px] overflow-y-auto">
                      {/* Basic Information */}
                      <div className="space-y-4">
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
                      </div>

                      {/* File Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium">File Information</h4>
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
                      </div>

                      {/* References */}
                      {references.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium">References</h4>
                          <div className="space-y-2">
                            {references.map((ref, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent"
                                onClick={() => handleReferenceClick(ref)}
                              >
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{ref.schemaName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Referenced By */}
                      {referencedBy.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Referenced By</h4>
                          <div className="space-y-2">
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
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="h-full mt-0">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-primary" />
                        Schema Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[500px] overflow-y-auto">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            JSON Schema content and structure
                          </p>
                          <Button variant="outline" size="sm" onClick={handleCopyContent}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                          <code>{JSON.stringify(schema.content, null, 2)}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="properties" className="h-full mt-0">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        Properties
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[500px] overflow-y-auto">
                      <div className="space-y-4">
                        {schema.content.properties && (
                          <div>
                            <h4 className="font-medium mb-2">Properties</h4>
                            <div className="space-y-2">
                              {Object.entries(schema.content.properties).map(([key, prop]) => {
                                const propertyType = getPropertyType(prop);
                                const isEnum = propertyType === 'enum' && Array.isArray(prop.enum);
                                const enumValues = isEnum ? prop.enum : [];
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
                                          {enumValues.map((enumValue: unknown, index: number) => (
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
                                  <span className="text-sm">{ref.schemaName}</span>
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
                </TabsContent>

                <TabsContent value="validation" className="h-full mt-0">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Validation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[500px] overflow-y-auto">
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
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onEdit(schema)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Schema
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
