import { MultiFileDropZone } from './MultiFileDropZone';
import { usePipelineStore } from '../../store/pipeline.store';

export function CSVUploader() {
  const files = usePipelineStore((s) => s.sources.csv);
  const setSourceFiles = usePipelineStore((s) => s.setSourceFiles);

  return (
    <MultiFileDropZone
      accept=".csv,text/csv"
      files={files}
      onFilesChange={(next) => setSourceFiles('csv', next)}
      label="Drop CSV files here or click to browse"
      description="Multiple rows per file; resume_path links to uploaded resumes"
      color="#10B981"
    />
  );
}
