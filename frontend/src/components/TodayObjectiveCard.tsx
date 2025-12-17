'use client';

import { useState } from 'react';

interface Objective {
  id: number;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
}

interface TodayObjectiveCardProps {
  goalTitle: string;
  goalDescription: string | null;
  currentObjective: Objective | null;
  nextObjective: Objective | null;
  allObjectives: Objective[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  secondSlotEnabled: boolean;
  onMarkDone: (objectiveId: number) => Promise<void>;
  onAddAnotherTask: () => void;
}

export default function TodayObjectiveCard({
  goalTitle,
  goalDescription,
  currentObjective,
  nextObjective,
  allObjectives,
  progress,
  secondSlotEnabled,
  onMarkDone,
  onAddAnotherTask,
}: TodayObjectiveCardProps) {
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handleMarkDone = async () => {
    if (!currentObjective) return;

    setIsMarkingDone(true);
    try {
      await onMarkDone(currentObjective.id);
    } catch (error) {
      console.error('Failed to mark objective as done:', error);
      alert('Failed to mark objective as done. Please try again.');
    } finally {
      setIsMarkingDone(false);
    }
  };

  // If no current objective, show completion message
  if (!currentObjective) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100/50 shadow-sm">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You're all caught up!
          </h2>
          <p className="text-gray-600">
            Great work! You've completed all objectives in "{goalTitle}".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Objective Card */}
      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 rounded-2xl p-6 border border-indigo-100/50 shadow-sm">
        {/* Goal Context */}
        <div className="mb-4 pb-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                {goalTitle}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium">
                  {progress.completed} of {progress.total} completed
                </span>
                <span className="text-gray-300">•</span>
                <span>{progress.percentage}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-yellow-500 text-lg">{currentObjective.points}</div>
              <div className="text-xs text-gray-500">pts</div>
            </div>
          </div>
        </div>

        {/* Objective Title */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {currentObjective.title}
          </h3>

          {currentObjective.description && (
            <div>
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showDescription ? '▼' : '▶'} Why this?
              </button>
              {showDescription && (
                <p className="mt-2 text-sm text-gray-600 bg-white/60 rounded-lg p-3 border border-gray-100">
                  {currentObjective.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkDone}
            disabled={isMarkingDone}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMarkingDone ? 'Marking Done...' : '✓ Mark Done'}
          </button>
        </div>
      </div>

      {/* Add Another Task (Second Slot) */}
      {!secondSlotEnabled && nextObjective && (
        <button
          onClick={onAddAnotherTask}
          className="w-full bg-white/60 hover:bg-white border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-center gap-2 text-gray-600 group-hover:text-indigo-600">
            <span className="text-2xl">+</span>
            <span className="font-medium">Add Another Task</span>
          </div>
        </button>
      )}

      {/* Second Objective (if enabled) */}
      {secondSlotEnabled && nextObjective && (
        <div className="bg-gradient-to-br from-blue-50/50 via-white to-cyan-50/50 rounded-2xl p-6 border border-blue-100/50 shadow-sm">
          <div className="mb-2">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Bonus Task
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {nextObjective.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-yellow-500 font-medium">{nextObjective.points} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}
