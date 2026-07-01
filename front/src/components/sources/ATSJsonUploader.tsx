import { MultiFileDropZone } from './MultiFileDropZone';
import { usePipelineStore } from '../../store/pipeline.store';

export function ATSJsonUploader() {
  const files = usePipelineStore((s) => s.sources.ats_json);
  const setSourceFiles = usePipelineStore((s) => s.setSourceFiles);

  return (
    <MultiFileDropZone
      accept=".json,application/json"
      files={files}
      onFilesChange={(next) => setSourceFiles('ats_json', next)}
      label="Drop ATS JSON files here or click to browse"
      description="One applicant per file; matched by email, phone, or name"
      color="#6366F1"
    />
  );
}
