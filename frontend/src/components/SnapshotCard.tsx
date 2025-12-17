'use client';

interface SnapshotCardProps {
  completedToday: number;
  totalPoints: number;
  streak: number;
}

export default function SnapshotCard({
  completedToday = 0,
  totalPoints = 0,
  streak = 0,
}: SnapshotCardProps) {
  const stats = [
    {
      label: 'Today',
      value: completedToday,
      emoji: '✅',
      color: 'from-green-400 to-emerald-500',
    },
    {
      label: 'Total Points',
      value: totalPoints,
      emoji: '⭐',
      color: 'from-yellow-400 to-amber-500',
    },
    {
      label: 'Day Streak',
      value: streak,
      emoji: '🔥',
      color: 'from-orange-400 to-red-500',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-cyan-50/50 via-white to-teal-50/50 rounded-2xl p-6 border border-cyan-100/50 shadow-sm">
      <h3 className="text-sm font-medium text-cyan-600 uppercase tracking-wide mb-4">
        Your Snapshot
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="text-center"
          >
            <div className="text-3xl mb-1">{stat.emoji}</div>
            <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
