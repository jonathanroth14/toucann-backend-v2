'use client';

export default function AchievementsCard() {
  // Placeholder achievements
  const achievements = [
    { id: 1, emoji: '🔥', label: '3 Day Streak' },
    { id: 2, emoji: '⭐', label: 'First Goal' },
    { id: 3, emoji: '🎯', label: '10 Tasks Done' },
  ];

  return (
    <div className="bg-gradient-to-br from-rose-50/50 via-white to-pink-50/50 rounded-2xl p-6 border border-rose-100/50 shadow-sm">
      <h3 className="text-sm font-medium text-rose-600 uppercase tracking-wide mb-4">
        Recent Achievements
      </h3>

      <div className="flex items-center gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center text-2xl shadow-sm">
              {achievement.emoji}
            </div>
            <span className="text-xs text-gray-600 text-center max-w-[60px]">
              {achievement.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
