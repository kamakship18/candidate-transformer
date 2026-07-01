import { MultiFileDropZone } from './MultiFileDropZone';
import { usePipelineStore } from '../../store/pipeline.store';

export function ResumeUploader() {
  const files = usePipelineStore((s) => s.sources.resume);
  const setSourceFiles = usePipelineStore((s) => s.setSourceFiles);

  return (
    <MultiFileDropZone
      accept=".pdf,application/pdf,.txt,text/plain"
      files={files}
      onFilesChange={(next) => setSourceFiles('resume', next)}
      label="Drop resume PDF or TXT files here or click to browse"
      description="Multiple resumes supported; linked from CSV resume_path column"
      color="#14B8A6"
    />
  );
}
