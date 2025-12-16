'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

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

interface CurrentChallenge {
  id: number;
  title: string;
  description: string | null;
  points: number;
  category: string | null;
  due_date: string | null;
  objectives: Objective[];
  has_next: boolean;
}

interface CurrentGoal {
  id: number;
  title: string;
  description: string | null;
}

interface ChallengeNode {
  id: number;
  title: string;
  points: number;
  sort_order: number;
  status: string;
  is_current: boolean;
}

interface TodayData {
  current_goal: CurrentGoal | null;
  current_challenge: CurrentChallenge | null;
  all_challenges: ChallengeNode[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export default function StudentDashboard() {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [completingObjective, setCompletingObjective] = useState<number | null>(null);
  const [requestingNext, setRequestingNext] = useState(false);

  useEffect(() => {
    loadTodayTask();
  }, []);

  const loadTodayTask = async () => {
    try {
      const data = await studentApi.getTodayTask();
      setTodayData(data);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteObjective = async (objectiveId: number) => {
    setCompletingObjective(objectiveId);
    setError('');

    try {
      await studentApi.completeObjective(objectiveId);
      await loadTodayTask();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCompletingObjective(null);
    }
  };

  const handleRequestNextChallenge = async () => {
    setRequestingNext(true);
    setError('');

    try {
      await studentApi.getNextChallenge();
      await loadTodayTask();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setRequestingNext(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center text-gray-600">Loading your task...</div>
      </div>
    );
  }

  if (error && !todayData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md whitespace-pre-wrap">
          {error}
        </div>
      </div>
    );
  }

  if (!todayData?.current_challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="glass-card p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 All Caught Up!
          </h2>
          <p className="text-gray-600">
            No active challenges right now. Check back later for new tasks!
          </p>
        </div>
      </div>
    );
  }

  const { current_goal, current_challenge, all_challenges, progress } = todayData;

  const completedObjectives = current_challenge.objectives.filter(
    (obj) => obj.status === 'COMPLETE'
  ).length;
  const totalObjectives = current_challenge.objectives.length;
  const objectiveProgress =
    totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
  const allObjectivesComplete = completedObjectives === totalObjectives;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated blurry blobs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {current_goal ? current_goal.title : 'Your Learning Journey'}
          </h1>
          {current_goal?.description && (
            <p className="text-gray-600 text-lg">{current_goal.description}</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Level & Achievements Cards Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <div className="text-sm text-gray-500 mb-1">Level</div>
            <div className="text-3xl font-bold text-gray-900">
              {Math.floor(progress.completed / 3) + 1}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-gray-500 mb-1">Achievements</div>
            <div className="text-3xl font-bold text-gray-900">{progress.completed}</div>
          </div>
        </div>

        {/* Today's Task - Spotlight Card with Gradient Border */}
        <div className="gradient-border-card">
          <div className="bg-white rounded-2xl p-8">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="pill-badge">Today's Task</span>
                {current_challenge.category && (
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {current_challenge.category}
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {current_challenge.title}
              </h2>
              {current_challenge.description && (
                <p className="text-gray-600 text-lg mb-4">
                  {current_challenge.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-blue-600">
                  {current_challenge.points} points
                </span>
                {current_challenge.due_date && (
                  <span className="text-gray-500">
                    Due: {new Date(current_challenge.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Next Steps
                </h3>
                <span className="text-xs text-gray-500">
                  {completedObjectives} / {totalObjectives} complete
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${objectiveProgress}%` }}
                />
              </div>

              {/* Objective list */}
              {current_challenge.objectives
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((obj) => {
                  const isComplete = obj.status === 'COMPLETE';
                  const isCompleting = completingObjective === obj.id;

                  return (
                    <div
                      key={obj.id}
                      className={`flex items-start gap-3 p-4 rounded-lg transition-all ${
                        isComplete
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isComplete ? (
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium ${
                            isComplete ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {obj.title}
                        </div>
                        {obj.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {obj.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {obj.points > 0 && (
                            <span className="text-blue-600 font-medium">
                              +{obj.points} pts
                            </span>
                          )}
                          {obj.is_required && (
                            <span className="text-red-600">Required</span>
                          )}
                        </div>
                      </div>

                      {!isComplete && (
                        <button
                          onClick={() => handleCompleteObjective(obj.id)}
                          disabled={isCompleting}
                          className="flex-shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isCompleting ? 'Marking...' : 'Complete'}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setShowAllChallenges(!showAllChallenges)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {showAllChallenges ? 'Hide Progress' : 'See Progress'}
              </button>
              {allObjectivesComplete && (
                <button
                  onClick={handleRequestNextChallenge}
                  disabled={requestingNext}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all"
                >
                  {requestingNext ? 'Loading...' : '+ Add Another Task'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Goals Progress Tracker - Horizontal Node View */}
        {showAllChallenges && all_challenges.length > 0 && (
          <div className="glass-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Your Progress
              </h3>
              <p className="text-sm text-gray-600">
                {progress.completed} of {progress.total} challenges complete ({progress.percentage}%)
              </p>
            </div>

            {/* Horizontal progress tracker */}
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {/* Challenge nodes */}
              <div className="relative flex justify-between">
                {all_challenges
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((challenge, index) => {
                    const isComplete = challenge.status === 'COMPLETE';
                    const isCurrent = challenge.is_current;

                    return (
                      <div
                        key={challenge.id}
                        className="flex flex-col items-center"
                        style={{ flex: 1 }}
                      >
                        {/* Node circle */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all ${
                            isCurrent
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-white scale-110 shadow-lg'
                              : isComplete
                              ? 'bg-green-500 text-white border-green-200'
                              : 'bg-white text-gray-400 border-gray-200'
                          }`}
                        >
                          {isComplete ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </div>

                        {/* Label */}
                        <div className="mt-3 text-center max-w-[100px]">
                          <div
                            className={`text-xs font-medium truncate ${
                              isCurrent
                                ? 'text-blue-600'
                                : isComplete
                                ? 'text-gray-600'
                                : 'text-gray-400'
                            }`}
                          >
                            {challenge.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {challenge.points} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Your Snapshot Card */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Snapshot</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{progress.completed}</div>
              <div className="text-xs text-gray-500 mt-1">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.total - progress.completed}
              </div>
              <div className="text-xs text-gray-500 mt-1">Remaining</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{progress.percentage}%</div>
              <div className="text-xs text-gray-500 mt-1">Progress</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .gradient-border-card {
          padding: 3px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          border-radius: 1.25rem;
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .pill-badge {
          display: inline-block;
          padding: 0.375rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s ease-in-out infinite;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          top: -10%;
          left: -10%;
          animation-delay: 0s;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          bottom: -10%;
          right: -5%;
          animation-delay: -7s;
        }

        .blob-3 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
