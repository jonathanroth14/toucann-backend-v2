'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import TodayTaskCard from '@/components/TodayTaskCard';

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
  points: number;
  category: string | null;
  due_date: string | null;
  objectives: Objective[];
  has_next?: boolean;
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

interface ChainPreview {
  id: number;
  title: string;
  points: number;
  category: string | null;
}

interface TodayData {
  current_goal: CurrentGoal | null;
  primary_challenge: Challenge | null;
  secondary_challenge: Challenge | null;
  challenge_chain: ChainPreview[];
  all_challenges: ChallengeNode[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  second_slot_enabled: boolean;
}

export default function StudentDashboard() {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNextSteps, setShowNextSteps] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center text-gray-600">Loading your tasks...</div>
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

  if (!todayData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="glass-card p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600">
            Unable to load your tasks. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const { current_goal, primary_challenge, secondary_challenge, challenge_chain, progress, second_slot_enabled } = todayData;

  const incompleteTasks = primary_challenge && primary_challenge.objectives.some(obj => obj.status === 'INCOMPLETE');

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

        {/* 1. Student Level Card (Progress Bar) */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎓</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Student Level</h3>
                <p className="text-sm text-gray-600">Keep completing tasks to level up!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">Level {Math.floor(progress.completed / 5) + 1}</div>
              <div className="text-xs text-gray-500">{progress.completed} tasks completed</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-600 text-right">
            {progress.completed} / {progress.total} challenges ({progress.percentage}%)
          </div>
        </div>

        {/* 2. Achievements Card */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-200 via-yellow-200 to-orange-300 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-xl font-bold text-gray-900">Achievements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{progress.completed}</span>
              <span className="text-gray-700">/ {progress.total}</span>
              <div className="ml-2 bg-orange-100 border border-orange-200 rounded-lg px-3 py-1">
                <span className="text-sm font-medium text-orange-900">1-day streak</span>
              </div>
            </div>
          </div>
          <p className="text-gray-800 mb-4">
            Nice start—come back tomorrow for a 2-day streak!
          </p>
          <button className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-md">
            🏆 View Achievements
          </button>
        </div>

        {/* 3. Next Steps Card (Conditional - only when tasks incomplete) */}
        {incompleteTasks && showNextSteps && primary_challenge && (
          <div className="rounded-2xl bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 p-6 shadow-lg border-2 border-blue-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <span className="text-xl font-bold text-gray-900">Next Steps</span>
                <span className="text-xs text-gray-600 ml-2 bg-white/50 px-2 py-1 rounded">
                  Appears only when needed
                </span>
              </div>
              <button
                onClick={() => setShowNextSteps(false)}
                className="text-gray-600 hover:text-gray-800 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <span className="text-gray-900 font-medium">
                  {primary_challenge.title}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {primary_challenge.objectives.filter(obj => obj.status === 'INCOMPLETE').length} steps remaining
              </div>
            </div>
          </div>
        )}

        {/* 4. Today's Task Card (THE MAIN FEATURE) */}
        <TodayTaskCard
          primaryChallenge={primary_challenge}
          secondaryChallenge={secondary_challenge}
          challengeChain={challenge_chain}
          secondSlotEnabled={second_slot_enabled}
          onRefresh={loadTodayTask}
        />

        {/* 5. Your Snapshot Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📸</span>
            <h3 className="text-lg font-semibold text-gray-900">Your Snapshot</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">GPA</div>
              <div className="text-2xl font-bold text-gray-900">3.6</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Grad Year</div>
              <div className="text-2xl font-bold text-gray-900">2027</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">SAT Goal</div>
              <div className="text-2xl font-bold text-gray-900">1400</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-2">Target Schools</div>
            <div className="bg-white rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm border border-gray-200">
              UT Austin
            </div>
          </div>
          <button className="mt-4 w-full border border-gray-300 bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>
        </div>
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
