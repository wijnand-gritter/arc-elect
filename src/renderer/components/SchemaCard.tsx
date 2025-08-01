/**
 * Schema card component for JSON Schema Editor.
 *
 * This component displays schema information in a card format with metadata,
 * validation status, and quick actions.
 *
 * @module SchemaCard
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import type { Schema, ValidationStatus } from '../../types/schema-editor';

/**
 * Schema card props.
 */
interface SchemaCardProps {
  /** Schema data to display */
  schema: Schema;
  /** Function called when card is clicked */
  onClick?: ((schema: Schema) => void) | undefined;
  /** Function called when edit button is clicked */
  onEdit?: ((schema: Schema) => void) | undefined;
  /** Function called when view button is clicked */
  onView?: ((schema: Schema) => void) | undefined;
  /** Whether the card is selected */
  selected?: boolean;
}

/**
 * Schema card component for displaying schema information.
 *
 * This component shows:
 * - Schema name and title
 * - Validation status with appropriate icon
 * - File metadata (size, last modified)
 * - Quick action buttons
 *
 * @param props - Component props
 * @returns JSX element representing the schema card
 *
 * @example
 * ```tsx
 * <SchemaCard
 *   schema={schemaData}
 *   onClick={handleSchemaClick}
 *   onEdit={handleSchemaEdit}
 *   selected={true}
 * />
 * ```
 */
export function SchemaCard({
  schema,
  onClick,
  onEdit,
  onView,
  selected = false,
}: SchemaCardProps): React.JSX.Element {
  /**
   * Gets the validation status icon and color.
   */
  const getValidationStatus = (status: ValidationStatus) => {
    switch (status) {
      case 'valid':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'bg-green-500',
          text: 'Valid',
        };
      case 'invalid':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-red-500',
          text: 'Invalid',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'bg-red-500',
          text: 'Error',
        };
      case 'pending':
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'bg-yellow-500',
          text: 'Pending',
        };
    }
  };

  /**
   * Formats file size in human readable format.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  /**
   * Formats date in relative format.
   */
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

  const validationStatus = getValidationStatus(schema.validationStatus);
  const fileSize = formatFileSize(schema.metadata.fileSize);
  const lastModified = schema.metadata.lastModified
    ? formatRelativeDate(new Date(schema.metadata.lastModified))
    : 'Unknown';

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        selected ? 'ring-2 ring-primary' : 'hover:border-primary/50'
      }`}
      onClick={() => onClick?.(schema)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-medium truncate">
                {schema.metadata.title || schema.name}
              </CardTitle>
              {schema.metadata.description && (
                <CardDescription className="text-sm truncate">
                  {schema.metadata.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge
            variant={schema.validationStatus === 'valid' ? 'default' : 'destructive'}
            className="flex items-center gap-1 flex-shrink-0"
          >
            {validationStatus.icon}
            {validationStatus.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{fileSize}</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{lastModified}</span>
              </div>
            </div>
            {schema.metadata.$schema && (
              <Badge variant="outline" className="text-xs">
                {schema.metadata.$schema.includes('draft-07') ? 'Draft 7' : 'JSON Schema'}
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onView?.(schema);
              }}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(schema);
              }}
            >
              <FileText className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
