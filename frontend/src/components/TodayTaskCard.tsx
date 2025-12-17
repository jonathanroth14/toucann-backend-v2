'use client';

import { useState } from 'react';
import TaskTile from './TaskTile';
import ChallengeTrack from './ChallengeTrack';
import { studentApi } from '@/lib/api';

interface Challenge {
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
}

interface TodayTaskCardProps {
  primaryChallenge: Challenge | null;
  secondaryChallenge: Challenge | null;
  challengeChain: Array<{
    id: number;
    title: string;
    points: number;
    category: string | null;
  }>;
  secondSlotEnabled: boolean;
  onRefresh: () => void;
}

export default function TodayTaskCard({
  primaryChallenge,
  secondaryChallenge,
  challengeChain,
  secondSlotEnabled,
  onRefresh,
}: TodayTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const handleMarkDone = async (challengeId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all objectives for this challenge
      const challenge = challengeId === primaryChallenge?.id ? primaryChallenge : secondaryChallenge;
      if (!challenge) return;

      // Find first incomplete objective
      const incompleteObjective = challenge.objectives.find(obj => obj.status === 'INCOMPLETE');

      if (incompleteObjective) {
        // Complete the objective
        await studentApi.completeObjective(incompleteObjective.id);
      }

      // Refresh the data
      onRefresh();
    } catch (err: any) {
      console.error('Error marking challenge done:', err);
      setError(err.message || 'Failed to mark challenge as done');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await studentApi.swapChallenge();
      onRefresh();
    } catch (err: any) {
      console.error('Error swapping challenge:', err);
      setError(err.message || 'Failed to swap challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await studentApi.snoozeChallenge(1); // Snooze for 1 day
      onRefresh();
    } catch (err: any) {
      console.error('Error snoozing challenge:', err);
      setError(err.message || 'Failed to snooze challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSecondSlot = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await studentApi.addSecondSlot();
      onRefresh();
    } catch (err: any) {
      console.error('Error adding second slot:', err);
      setError(err.message || 'Failed to add second slot');
    } finally {
      setIsLoading(false);
    }
  };

  if (!primaryChallenge) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">All caught up!</h3>
          <p className="text-sm">No challenges available right now. Great work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Today's Task</h2>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAllTasks(!showAllTasks)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            See more
          </button>

          {!secondSlotEnabled && (
            <button
              onClick={handleAddSecondSlot}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              + Add another task
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Primary task tile */}
      <div className="space-y-4">
        <TaskTile
          challenge={primaryChallenge}
          onMarkDone={() => handleMarkDone(primaryChallenge.id)}
          onSwap={handleSwap}
          onSnooze={handleSnooze}
          isSecondary={false}
          showActions={!isLoading}
        />

        {/* Challenge chain progress track */}
        <ChallengeTrack
          currentTitle={primaryChallenge.title}
          chain={challengeChain}
        />
      </div>

      {/* Secondary task tile (if enabled) */}
      {secondSlotEnabled && secondaryChallenge && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-800">Bonus Task</h3>
            <p className="text-xs text-gray-500">Optional challenge for extra points</p>
          </div>

          <TaskTile
            challenge={secondaryChallenge}
            onMarkDone={() => handleMarkDone(secondaryChallenge.id)}
            onSwap={handleSwap}
            onSnooze={handleSnooze}
            isSecondary={true}
            showActions={!isLoading}
          />
        </div>
      )}

      {/* Show all tasks modal/list (simplified for now) */}
      {showAllTasks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">All Available Tasks</h3>
              <button
                onClick={() => setShowAllTasks(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <p>Current primary task: <strong>{primaryChallenge.title}</strong></p>
              {secondaryChallenge && (
                <p className="mt-2">Current bonus task: <strong>{secondaryChallenge.title}</strong></p>
              )}
              {challengeChain.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Upcoming in your chain:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {challengeChain.map(ch => (
                      <li key={ch.id}>{ch.title} ({ch.points} pts)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
