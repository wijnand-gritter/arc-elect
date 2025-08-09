import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-hidden h-[80vh]"
      >
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle>Conversion Report</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto p-2">
          <ReportView summary={summary} reports={reports} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
