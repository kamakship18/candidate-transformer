import { MultiFileDropZone } from './MultiFileDropZone';
import { usePipelineStore } from '../../store/pipeline.store';

export function NotesUploader() {
  const files = usePipelineStore((s) => s.sources.notes);
  const setSourceFiles = usePipelineStore((s) => s.setSourceFiles);

  return (
    <MultiFileDropZone
      accept=".txt,text/plain"
      files={files}
      onFilesChange={(next) => setSourceFiles('notes', next)}
      label="Drop recruiter notes .txt files here"
      description="Free text — emails and skills extracted via regex"
      color="#EC4899"
    />
  );
}
