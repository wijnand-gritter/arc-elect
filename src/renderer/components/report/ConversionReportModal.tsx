import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import type {
  ConversionReport,
  ConversionSummary,
} from '../../../types/raml-import';
import { ConversionReport as ReportView } from './ConversionReport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary?: ConversionSummary;
  reports?: ConversionReport[];
}

export function ConversionReportModal({
  isOpen,
  onClose,
  summary,
  reports,
}: Props): React.JSX.Element {
  const safeSummary: ConversionSummary = summary ?? {
    filesProcessed: 0,
    enumsCreated: 0,
    businessObjectsCreated: 0,
    unionsCount: 0,
    inlineEnumsExtracted: 0,
    dedupedEnums: 0,
    warningsCount: 0,
    errorsCount: 0,
    durationMs: 0,
    outputDirectory: '',
  };
  const safeReports: ConversionReport[] = reports ?? [];
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only" aria-describedby="Conversion Report">
        Conversion Report
      </DialogTitle>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-auto h-[80vh]"
        aria-describedby="Conversion Report"
      >
        <div className="p-2">
          <ReportView summary={safeSummary} reports={safeReports} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
