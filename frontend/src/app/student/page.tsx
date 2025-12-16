'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  status: string;
  completed_at: string | null;
}

interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: string;
  objectives: Challenge[];
}

export default function StudentPage() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingChallenge, setCompletingChallenge] = useState<number | null>(null);

  useEffect(() => {
    loadActiveGoal();
  }, []);

  const loadActiveGoal = async () => {
    try {
      const data = await studentApi.getActiveChallenge();
      setGoal(data);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChallenge = async (challengeId: number) => {
    setCompletingChallenge(challengeId);
    setError('');

    try {
      await studentApi.completeObjective(challengeId);
      // Reload active goal to get updated state
      await loadActiveGoal();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCompletingChallenge(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading your goal...</div>
      </div>
    );
  }

  if (error && !goal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-wrap">
          {error}
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Active Goal
          </h2>
          <p className="text-gray-600">
            Check back later for new goals!
          </p>
        </div>
      </div>
    );
  }

  const completedCount = goal.objectives.filter((challenge) => challenge.status === 'COMPLETE').length;
  const totalCount = goal.objectives.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-2">
          <span className="text-sm text-gray-500 uppercase tracking-wide">Your Current Goal</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {goal.title}
        </h1>
        {goal.description && (
          <p className="text-gray-600 mb-4">{goal.description}</p>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>
              {completedCount} / {totalCount} challenges
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <span
            className={`px-3 py-1 rounded font-medium ${
              goal.status === 'COMPLETE'
                ? 'bg-green-100 text-green-800'
                : goal.status === 'IN_PROGRESS'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {goal.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Next Steps</h2>
          <span className="text-sm text-gray-500">Quick wins to move forward</span>
        </div>

        {goal.objectives
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((challenge) => {
            const isComplete = challenge.status === 'COMPLETE';
            const isCompleting = completingChallenge === challenge.id;

            return (
              <div
                key={challenge.id}
                className={`bg-white rounded-lg shadow p-6 transition-all ${
                  isComplete ? 'opacity-75' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      {isComplete && (
                        <svg
                          className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <div className="flex-1">
                        <h3
                          className={`text-lg font-semibold ${
                            isComplete ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {challenge.title}
                        </h3>
                        {challenge.description && (
                          <p className="text-gray-600 mt-1 text-sm">
                            {challenge.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="font-medium text-blue-600">
                            {challenge.points} points
                          </span>
                          {challenge.is_required && (
                            <span className="text-red-600 text-xs">Required</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isComplete && (
                    <button
                      onClick={() => handleCompleteChallenge(challenge.id)}
                      disabled={isCompleting}
                      className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isCompleting ? 'Marking...' : 'Complete'}
                    </button>
                  )}
                </div>

                {isComplete && challenge.completed_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Completed on {new Date(challenge.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      {goal.status === 'COMPLETE' && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mt-8 text-center">
          <svg
            className="w-16 h-16 text-green-500 mx-auto mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-2xl font-bold text-green-900 mb-2">
            Goal Complete!
          </h3>
          <p className="text-green-700 mb-4">
            Great work completing all challenges. Your next goal will be available soon.
          </p>
          <button
            onClick={loadActiveGoal}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700"
          >
            Check for Next Goal
          </button>
        </div>
      )}
    </div>
  );
}
