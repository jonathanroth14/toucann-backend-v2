'use client';

import { useState } from 'react';
import WhyThisAccordion from './WhyThisAccordion';

interface TaskTileProps {
  challenge: {
    id: number;
    title: string;
    description: string | null;
    points: number;
    category: string | null;
    due_date: string | null;
    objectives: Array<{
      id: number;
      title: string;
      description: string | null;
      points: number;
      sort_order: number;
      is_required: boolean;
      status: string;
      completed_at: string | null;
    }>;
  };
  onMarkDone: () => void;
  onSwap: () => void;
  onSnooze: () => void;
  onOpenDetails?: () => void;
  isSecondary?: boolean;
  showActions?: boolean;
}

export default function TaskTile({
  challenge,
  onMarkDone,
  onSwap,
  onSnooze,
  onOpenDetails,
  isSecondary = false,
  showActions = true,
}: TaskTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get current incomplete objective
  const currentObjective = challenge.objectives.find(obj => obj.status === 'INCOMPLETE');
  const completedCount = challenge.objectives.filter(obj => obj.status === 'COMPLETE').length;
  const totalCount = challenge.objectives.length;

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Badge and category */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold rounded-full shadow-sm">
            {challenge.category || 'Daily Boost'}
          </span>
          {isSecondary && (
            <span className="text-xs text-gray-500 font-medium">Bonus Task</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-yellow-500">
          <span className="text-sm font-bold">{challenge.points}</span>
          <span className="text-xs">pts</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {challenge.title}
      </h3>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        {challenge.due_date && (
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>{new Date(challenge.due_date).toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>✓</span>
          <span>{completedCount}/{totalCount} objectives</span>
        </div>
      </div>

      {/* Current objective */}
      {currentObjective && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="text-sm font-medium text-blue-900 mb-1">
            Current step:
          </div>
          <div className="text-sm text-blue-800">
            {currentObjective.title}
          </div>
        </div>
      )}

      {/* All objectives (expandable) */}
      {challenge.objectives.length > 1 && (
        <div className="mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? '- Hide all steps' : '+ Show all steps'}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1">
              {challenge.objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`text-sm flex items-start gap-2 ${
                    obj.status === 'COMPLETE' ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}
                >
                  <span className="mt-0.5">
                    {obj.status === 'COMPLETE' ? '✅' : '⭕'}
                  </span>
                  <span>{obj.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Why this? accordion */}
      <WhyThisAccordion content={challenge.description} />

      {/* Action buttons */}
      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onMarkDone}
            className="flex-1 min-w-[120px] px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
          >
            Mark done ✓
          </button>

          {onOpenDetails && (
            <button
              onClick={onOpenDetails}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Details
            </button>
          )}

          <button
            onClick={onSwap}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Swap
          </button>

          <button
            onClick={onSnooze}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Not today
          </button>
        </div>
      )}
    </div>
  );
}
