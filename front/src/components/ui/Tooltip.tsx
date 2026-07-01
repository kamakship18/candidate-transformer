import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
}

export function Tooltip({ content, children, delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 8 + window.scrollY,
          left: rect.left + rect.width / 2,
        });
        setVisible(true);
      }
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const child = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <>
      {child}
      {visible &&
        createPortal(
          <div
            className="fixed z-50 pointer-events-none"
            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -100%)' }}
          >
            <div className="bg-surface-3 border border-border text-text-primary text-xs rounded-md px-2.5 py-1.5 max-w-xs shadow-xl animate-fade-in-up">
              {content}
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #2A2A32',
                bottom: '-5px',
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
