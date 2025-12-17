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
  const [showTaskList, setShowTaskList] = useState(false);
  const [completingObjective, setCompletingObjective] = useState<number | null>(null);
  const [requestingNext, setRequestingNext] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState(false);

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
  const allObjectivesComplete = completedObjectives === totalObjectives;

  // Get other challenges (not current)
  const otherChallenges = all_challenges.filter(c => !c.is_current && c.status !== 'COMPLETE');

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

        {/* Achievements Card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-xl font-bold text-gray-900">Achievements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{progress.completed}</span>
              <span className="text-gray-500">/ {progress.total}</span>
            </div>
          </div>
          <div className="bg-orange-100 rounded-lg px-4 py-2 inline-block">
            <span className="text-sm font-medium text-orange-800">1-day streak</span>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Nice start—come back tomorrow for a 2-day streak!
          </p>
          <button className="mt-4 w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            🏆 View Achievements
          </button>
        </div>

        {/* Next Steps Card - Appears only when needed */}
        {!allObjectivesComplete && (
          <div className="glass-card p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚠️</span>
                <span className="text-xl font-bold text-gray-900">Next Steps</span>
                <span className="text-xs text-gray-500 ml-2">Appears only when needed</span>
              </div>
              <button
                onClick={() => setExpandedWhy(!expandedWhy)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <span className="text-gray-900 font-medium">
                  Complete today's task objectives
                </span>
              </div>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Mark done
              </button>
            </div>
          </div>
        )}

        {/* Today's Task - ONE Featured Task */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <span className="text-xl font-bold text-gray-900">Today's Task</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTaskList(!showTaskList)}
                className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showTaskList ? 'Hide list' : 'Show list'}
              </button>
              {allObjectivesComplete && (
                <button
                  onClick={handleRequestNextChallenge}
                  disabled={requestingNext}
                  className="text-sm bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {requestingNext ? 'Loading...' : '+ Add another task'}
                </button>
              )}
            </div>
          </div>

          {/* Featured Task Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <span className="text-4xl">⭐</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Daily Boost
                  </span>
                  {current_challenge.category && (
                    <span className="text-xs text-gray-500 uppercase">
                      {current_challenge.category}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {current_challenge.title}
                </h3>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {current_challenge.due_date && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{new Date(current_challenge.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>{current_challenge.points} pts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span>{current_challenge.category || 'General'}</span>
                  </div>
                </div>

                {/* Why this? expandable */}
                <button
                  onClick={() => setExpandedWhy(!expandedWhy)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
                >
                  <span>{expandedWhy ? '▼' : '▶'}</span>
                  <span>Why this?</span>
                </button>

                {expandedWhy && current_challenge.description && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4 text-sm text-gray-700">
                    {current_challenge.description}
                  </div>
                )}

                {/* Objectives as subtasks */}
                {current_challenge.objectives.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {current_challenge.objectives
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((obj) => {
                        const isComplete = obj.status === 'COMPLETE';
                        const isCompleting = completingObjective === obj.id;

                        return (
                          <div
                            key={obj.id}
                            className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                          >
                            <input
                              type="checkbox"
                              checked={isComplete}
                              onChange={() => !isComplete && handleCompleteObjective(obj.id)}
                              disabled={isCompleting}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                isComplete ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {obj.title}
                            </span>
                            {obj.points > 0 && (
                              <span className="text-xs text-gray-500">+{obj.points} pts</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <span>✏️</span>
                    <span>Make it easier</span>
                  </button>
                  <button className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    Open details
                  </button>
                  <button className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <span>🔄</span>
                    <span>Swap</span>
                  </button>
                </div>

                <button className="mt-3 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                  <span>😴</span>
                  <span>Not today</span>
                </button>
              </div>
            </div>
          </div>

          {/* Collapsed task list */}
          {showTaskList && otherChallenges.length > 0 && (
            <div className="space-y-2">
              {otherChallenges.slice(0, 3).map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{challenge.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>📅 12/19/2025</span>
                      <span>⭐ {challenge.points} pts</span>
                      <span>👤 Profile</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">▼</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Snapshot Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📸</span>
            <h3 className="text-lg font-semibold text-gray-900">Your Snapshot</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">GPA</div>
              <div className="text-2xl font-bold text-gray-900">3.6</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Grad Year</div>
              <div className="text-2xl font-bold text-gray-900">2027</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">SAT Goal</div>
              <div className="text-2xl font-bold text-gray-900">1400</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Target Schools</div>
            <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-700">
              UT Austin
            </div>
          </div>
          <button className="mt-4 w-full border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
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
