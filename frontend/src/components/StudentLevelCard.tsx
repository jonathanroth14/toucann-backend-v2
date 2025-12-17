'use client';

interface StudentLevelCardProps {
  totalPoints: number;
}

export default function StudentLevelCard({ totalPoints }: StudentLevelCardProps) {
  // Simple level calculation: 100 points per level
  const level = Math.floor(totalPoints / 100) + 1;
  const pointsToNextLevel = (level * 100) - totalPoints;
  const progressPercentage = ((totalPoints % 100) / 100) * 100;

  return (
    <div className="bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/50 rounded-2xl p-6 border border-violet-100/50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-violet-600 uppercase tracking-wide mb-1">
            Your Level
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">Level {level}</span>
            <span className="text-sm text-gray-500">{totalPoints} pts</span>
          </div>
        </div>
        <div className="text-5xl">🎯</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-600">
        {pointsToNextLevel} points until Level {level + 1}
      </p>
    </div>
  );
}
