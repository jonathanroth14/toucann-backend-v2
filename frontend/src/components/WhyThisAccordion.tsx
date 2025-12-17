'use client';

import { useState } from 'react';

interface WhyThisAccordionProps {
  content: string | null;
}

export default function WhyThisAccordion({ content }: WhyThisAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span className="text-lg">{isOpen ? '▼' : '▶'}</span>
        <span>Why this?</span>
      </button>

      {isOpen && (
        <div className="mt-2 pl-6 text-sm text-gray-600 leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}
