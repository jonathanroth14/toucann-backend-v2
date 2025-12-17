'use client';

import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import TodayObjectiveCard from '@/components/TodayObjectiveCard';
import ObjectiveProgressTrack from '@/components/ObjectiveProgressTrack';
import NextStepsPanel from '@/components/NextStepsPanel';
import StudentLevelCard from '@/components/StudentLevelCard';
import AchievementsCard from '@/components/AchievementsCard';
import SnapshotCard from '@/components/SnapshotCard';

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

interface CurrentGoal {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

interface TodayData {
  current_goal: CurrentGoal | null;
  current_objective: Objective | null;
  next_objective: Objective | null;
  all_objectives: Objective[];
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
  const [secondSlotEnabled, setSecondSlotEnabled] = useState(false);

  useEffect(() => {
    loadTodayTask();
  }, []);

  const loadTodayTask = async () => {
    try {
      const data = await studentApi.getTodayTask();
      setTodayData(data);
      setSecondSlotEnabled(data.second_slot_enabled);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (objectiveId: number) => {
    try {
      await studentApi.completeGoalStep(objectiveId);
      // Reload data to get next objective
      await loadTodayTask();
    } catch (err) {
      setError(formatApiError(err));
      throw err; // Re-throw to let component handle it
    }
  };

  const handleAddAnotherTask = () => {
    setSecondSlotEnabled(true);
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

  const { current_goal, current_objective, next_objective, all_objectives, progress } = todayData;

  // Calculate total points from completed objectives
  const totalPoints = all_objectives
    .filter(obj => obj.is_completed)
    .reduce((sum, obj) => sum + obj.points, 0);

  // Calculate completed today (simple placeholder)
  const completedToday = all_objectives.filter(obj => {
    if (!obj.completed_at) return false;
    const completedDate = new Date(obj.completed_at);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  }).length;

  // Placeholder streak
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

        {/* 1. Student Level Card */}
        <StudentLevelCard totalPoints={totalPoints} />

        {/* 2. Achievements Card */}
        <AchievementsCard />

        {/* 3. Next Steps Panel (Notifications - only shows if there are notifications) */}
        <NextStepsPanel />

        {/* 4. Progress Track */}
        {current_goal && all_objectives.length > 0 && (
          <ObjectiveProgressTrack
            goalTitle={current_goal.title}
            objectives={all_objectives}
            currentObjectiveId={current_objective?.id || null}
          />
        )}

        {/* 5. Today's Task (Main Feature) */}
        {current_goal && (
          <TodayObjectiveCard
            goalTitle={current_goal.title}
            goalDescription={current_goal.description}
            currentObjective={current_objective}
            nextObjective={next_objective}
            allObjectives={all_objectives}
            progress={progress}
            secondSlotEnabled={secondSlotEnabled}
            onMarkDone={handleMarkDone}
            onAddAnotherTask={handleAddAnotherTask}
          />
        )}

        {/* 6. Snapshot Card */}
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
