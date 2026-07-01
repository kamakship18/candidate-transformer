import { useState } from 'react';
import { ConfigEditor } from '../config/ConfigEditor';
import { RawJsonView } from '../profile/RawJsonView';
import { Card, CardHeader } from '../ui/Card';

type OutputTab = 'config' | 'projected' | 'canonical';

interface OutputDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function OutputDrawer({ open, onClose }: OutputDrawerProps) {
  const [tab, setTab] = useState<OutputTab>('config');

  if (!open) {
    return null;
  }

  const tabs: { id: OutputTab; label: string }[] = [
    { id: 'config', label: 'Config' },
    { id: 'projected', label: 'Projected' },
    { id: 'canonical', label: 'Canonical' },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Close output panel"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <aside
        className={[
          'fixed z-50 top-14 right-0 bottom-0 w-full max-w-md',
          'border-l border-border/60 bg-gradient-surface backdrop-blur-xl',
          'flex flex-col shadow-2xl shadow-black/40 animate-fade-in-up',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold text-text-primary">Output</p>
            <p className="text-xs text-text-muted">Config & JSON views</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xs px-2 py-1 rounded-md hover:bg-surface-2 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-border/40 pb-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === item.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {tab === 'config' && (
            <Card elevated>
              <CardHeader title="Output Config" subtitle="Runtime field projection" className="mb-3" />
              <ConfigEditor />
            </Card>
          )}
          {tab === 'projected' && (
            <Card elevated>
              <CardHeader title="Projected Output" subtitle="Config-shaped result" className="mb-3" />
              <RawJsonView showProjected />
            </Card>
          )}
          {tab === 'canonical' && (
            <Card elevated>
              <CardHeader title="Canonical Record" subtitle="Full merged profile" className="mb-3" />
              <RawJsonView showProjected={false} />
            </Card>
          )}
        </div>
      </aside>
    </>
  );
}
