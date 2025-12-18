'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import StudentLevelCard from '@/components/StudentLevelCard';
import AchievementsCard from '@/components/AchievementsCard';
import SnapshotCard from '@/components/SnapshotCard';

interface Task {
  id: number;
  goal_id: number;
  goal_title: string;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  snoozed_until: string | null;
}

interface GoalProgress {
  goal_id: number;
  goal_title: string;
  total: number;
  completed: number;
  percentage: number;
}

interface TodayTaskData {
  task: Task | null;
  goal_progress: GoalProgress | null;
  available_count: number;
}

export default function StudentDashboard() {
  const [primaryTask, setPrimaryTask] = useState<TodayTaskData | null>(null);
  const [secondaryTask, setSecondaryTask] = useState<TodayTaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTodayTask();
  }, []);

  const loadTodayTask = async () => {
    try {
      const data = await studentApi.getTodayTask();
      setPrimaryTask(data);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (taskId: number) => {
    try {
      setActionLoading(true);
      setError('');

      await studentApi.completeTask(taskId);

      // Reload primary task
      await loadTodayTask();

      // Clear secondary task if it was the one completed
      if (secondaryTask?.task?.id === taskId) {
        setSecondaryTask(null);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnooze = async (taskId: number) => {
    try {
      setActionLoading(true);
      setError('');

      await studentApi.snoozeTask(taskId, 1);

      // Reload to get next available task
      await loadTodayTask();

      // Clear secondary task if it was the one snoozed
      if (secondaryTask?.task?.id === taskId) {
        setSecondaryTask(null);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwap = async (taskId: number) => {
    try {
      setActionLoading(true);
      setError('');

      const swapped = await studentApi.swapTask(taskId);

      // Update primary task with swapped task
      setPrimaryTask(swapped);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAnotherTask = async () => {
    try {
      setActionLoading(true);
      setError('');

      const anotherTask = await studentApi.addAnotherTask();

      if (anotherTask.task) {
        setSecondaryTask(anotherTask);
      } else {
        setError('No additional tasks available');
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center text-gray-600">Loading your tasks...</div>
      </div>
    );
  }

  if (error && !primaryTask) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md whitespace-pre-wrap">
          {error}
        </div>
      </div>
    );
  }

  const task = primaryTask?.task;
  const goalProgress = primaryTask?.goal_progress;
  const availableCount = primaryTask?.available_count || 0;

  // Calculate total points (placeholder)
  const totalPoints = goalProgress ? goalProgress.completed * 10 : 0;

  // Placeholder values
  const completedToday = 0;
  const streak = 1;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative min-h-[calc(100vh-4rem)]">
      {/* Animated blurry blobs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {goalProgress ? goalProgress.goal_title : 'Your Learning Journey'}
          </h1>
          <p className="text-gray-600 text-lg">
            {goalProgress
              ? `${goalProgress.completed} of ${goalProgress.total} tasks completed (${goalProgress.percentage}%)`
              : 'No active goals yet'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* 1. Student Level Card */}
        <StudentLevelCard totalPoints={totalPoints} />

        {/* 2. Achievements Card */}
        <AchievementsCard />

        {/* 3. Today's Task Card */}
        {task ? (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Today's Task</h2>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {availableCount} task{availableCount !== 1 ? 's' : ''} available
                </span>

                {!secondaryTask && availableCount > 1 && (
                  <button
                    onClick={handleAddAnotherTask}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    + Add another task
                  </button>
                )}
              </div>
            </div>

            {/* Primary Task */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow mb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold rounded-full shadow-sm">
                  Task {task.sort_order + 1}
                </span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <span className="text-sm font-bold">{task.points}</span>
                  <span className="text-xs">pts</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {task.title}
              </h3>

              {/* Description */}
              {task.description && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-sm text-blue-900">
                    {task.description}
                  </div>
                </div>
              )}

              {/* Goal info */}
              <div className="text-xs text-gray-500 mb-4">
                Part of: <span className="font-medium text-gray-700">{task.goal_title}</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleMarkDone(task.id)}
                  disabled={actionLoading}
                  className="flex-1 min-w-[120px] px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm disabled:opacity-50"
                >
                  Mark done ✓
                </button>

                <button
                  onClick={() => handleSwap(task.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Swap
                </button>

                <button
                  onClick={() => handleSnooze(task.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Not today
                </button>
              </div>
            </div>

            {/* Progress bar for goal */}
            {goalProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Goal Progress</span>
                  <span>{goalProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${goalProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              All caught up!
            </h2>
            <p className="text-gray-600">
              No tasks available right now. Great work!
            </p>
          </div>
        )}

        {/* Secondary Task (if added) */}
        {secondaryTask?.task && (
          <div className="glass-card p-6">
            <div className="mb-3">
              <h3 className="text-lg font-bold text-gray-800">Bonus Task</h3>
              <p className="text-xs text-gray-500">Optional task for extra points</p>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 bg-gradient-to-r from-blue-400 to-cyan-400 text-white text-xs font-bold rounded-full shadow-sm">
                  Bonus
                </span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <span className="text-sm font-bold">{secondaryTask.task.points}</span>
                  <span className="text-xs">pts</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {secondaryTask.task.title}
              </h3>

              {/* Description */}
              {secondaryTask.task.description && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-sm text-blue-900">
                    {secondaryTask.task.description}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleMarkDone(secondaryTask.task!.id)}
                  disabled={actionLoading}
                  className="flex-1 min-w-[120px] px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm disabled:opacity-50"
                >
                  Mark done ✓
                </button>

                <button
                  onClick={() => setSecondaryTask(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Snapshot Card */}
        <SnapshotCard
          completedToday={completedToday}
          totalPoints={totalPoints}
          streak={streak}
        />
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
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
