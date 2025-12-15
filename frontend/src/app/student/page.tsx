'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';

interface Objective {
  id: number;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  status: string;
  completed_at: string | null;
}

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  status: string;
  objectives: Objective[];
}

export default function StudentPage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingObj, setCompletingObj] = useState<number | null>(null);

  useEffect(() => {
    loadActiveChallenge();
  }, []);

  const loadActiveChallenge = async () => {
    try {
      const data = await studentApi.getActiveChallenge();
      setChallenge(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteObjective = async (objectiveId: number) => {
    setCompletingObj(objectiveId);
    setError('');

    try {
      await studentApi.completeObjective(objectiveId);
      // Reload active challenge to get updated state
      await loadActiveChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete objective');
    } finally {
      setCompletingObj(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading your challenge...</div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Active Challenge
          </h2>
          <p className="text-gray-600">
            Check back later for new challenges!
          </p>
        </div>
      </div>
    );
  }

  const completedCount = challenge.objectives.filter((obj) => obj.status === 'COMPLETE').length;
  const totalCount = challenge.objectives.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {challenge.title}
        </h1>
        {challenge.description && (
          <p className="text-gray-600 mb-4">{challenge.description}</p>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>
              {completedCount} / {totalCount} objectives
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
              challenge.status === 'COMPLETE'
                ? 'bg-green-100 text-green-800'
                : challenge.status === 'IN_PROGRESS'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {challenge.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Objectives</h2>

        {challenge.objectives
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((objective) => {
            const isComplete = objective.status === 'COMPLETE';
            const isCompleting = completingObj === objective.id;

            return (
              <div
                key={objective.id}
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
                          {objective.title}
                        </h3>
                        {objective.description && (
                          <p className="text-gray-600 mt-1 text-sm">
                            {objective.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="font-medium text-blue-600">
                            {objective.points} points
                          </span>
                          {objective.is_required && (
                            <span className="text-red-600 text-xs">Required</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isComplete && (
                    <button
                      onClick={() => handleCompleteObjective(objective.id)}
                      disabled={isCompleting}
                      className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isCompleting ? 'Marking...' : 'Mark Complete'}
                    </button>
                  )}
                </div>

                {isComplete && objective.completed_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Completed on {new Date(objective.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      {challenge.status === 'COMPLETE' && (
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
            Challenge Complete!
          </h3>
          <p className="text-green-700">
            Great job! Your next challenge will be available soon.
          </p>
          <button
            onClick={loadActiveChallenge}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700"
          >
            Check for Next Challenge
          </button>
        </div>
      )}
    </div>
  );
}
