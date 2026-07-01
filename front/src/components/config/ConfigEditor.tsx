import { useEffect, useState } from 'react';
import { usePipelineStore } from '../../store/pipeline.store';
import { validateOutputConfigString } from '@back/pipeline/validator';
import { DEFAULT_OUTPUT_CONFIG } from '@back/pipeline/runner';

const CUSTOM_CONFIG_EXAMPLE = JSON.stringify(
  {
    merge_policy: 'csv_resume_agreement',
    min_field_confidence: 0.75,
    fields: [
      { path: 'full_name', type: 'string', required: true, include: true },
      { path: 'primary_email', from: 'emails[0]', type: 'string', include: true },
      { path: 'phone', from: 'phones[0]', type: 'string', normalize: 'E164', include: true },
      { path: 'headline', type: 'string', include: true },
      { path: 'years_experience', type: 'number', include: true },
      { path: 'location', type: 'object', include: false },
      { path: 'top_skills', from: 'skills[].name', type: 'string[]', include: true },
    ],
    include_confidence: true,
    include_provenance: true,
    on_missing: 'omit',
  },
  null,
  2
);

export function ConfigEditor() {
  const setOutputConfig = usePipelineStore((s) => s.setOutputConfig);
  const [value, setValue] = useState(JSON.stringify(DEFAULT_OUTPUT_CONFIG, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  const validate = (jsonString: string) => {
    const result = validateOutputConfigString(jsonString);
    setErrors(result.errors);
    setIsValid(result.valid);
    if (result.valid && result.config) {
      setOutputConfig(result.config);
    }
  };

  useEffect(() => {
    validate(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    validate(v);
  };

  const loadExample = () => {
    setValue(CUSTOM_CONFIG_EXAMPLE);
    validate(CUSTOM_CONFIG_EXAMPLE);
  };

  const loadDefault = () => {
    const defaultStr = JSON.stringify(DEFAULT_OUTPUT_CONFIG, null, 2);
    setValue(defaultStr);
    validate(defaultStr);
  };

  const loadOutputConfig = async () => {
    try {
      const response = await fetch('/output_config.json');
      const json = await response.json();
      const nextValue = JSON.stringify(json, null, 2);
      setValue(nextValue);
      validate(nextValue);
    } catch {
      setErrors(['Failed to load /output_config.json']);
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={loadDefault}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded border border-border hover:border-border-hover"
        >
          Default
        </button>
        <button
          onClick={loadOutputConfig}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded border border-border hover:border-border-hover"
        >
          Load output_config.json
        </button>
        <button
          onClick={loadExample}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded border border-border hover:border-border-hover"
        >
          Custom example
        </button>
        <div className="ml-auto">
          {isValid ? (
            <span className="text-xs text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Valid
            </span>
          ) : (
            <span className="text-xs text-danger flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              Invalid
            </span>
          )}
        </div>
      </div>

      <textarea
        id="config-editor-textarea"
        value={value}
        onChange={handleChange}
        spellCheck={false}
        className={[
          'w-full h-56 font-mono text-xs text-text-primary bg-surface-3 border rounded-lg px-3 py-2.5 resize-none outline-none transition-colors scrollbar-thin',
          isValid ? 'border-border focus:border-border-hover' : 'border-danger/50 focus:border-danger',
        ].join(' ')}
      />

      {errors.length > 0 && (
        <div className="space-y-1 animate-fade-in-up">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger font-mono leading-snug">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="text-xs text-text-muted leading-relaxed">
        <span className="font-mono text-text-secondary">merge_policy</span>:{' '}
        <span className="font-mono">"csv_resume_agreement"</span> only emits fields confirmed in both CSV and resume.
        <br />
        Set <span className="font-mono text-text-secondary">include: false</span> to hide a field from projected output.
        <br />
        <span className="font-mono text-text-secondary">on_missing</span>: <span className="font-mono">"null"</span> |{' '}
        <span className="font-mono">"omit"</span> | <span className="font-mono">"error"</span>
      </div>
    </div>
  );
}
