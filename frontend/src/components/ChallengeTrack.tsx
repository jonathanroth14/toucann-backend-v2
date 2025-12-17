'use client';

interface ChallengeTrackProps {
  currentTitle: string;
  chain: Array<{
    id: number;
    title: string;
    points: number;
    category: string | null;
  }>;
}

export default function ChallengeTrack({ currentTitle, chain }: ChallengeTrackProps) {
  if (chain.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-2">Your path today</div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {/* Current challenge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-full shadow-sm">
            {currentTitle.length > 20 ? currentTitle.substring(0, 20) + '...' : currentTitle}
          </div>
          {chain.length > 0 && (
            <span className="text-gray-400">→</span>
          )}
        </div>

        {/* Next challenges in chain */}
        {chain.map((challenge, index) => (
          <div key={challenge.id} className="flex items-center gap-2 flex-shrink-0">
            <div className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-300">
              {challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title}
            </div>
            {index < chain.length - 1 && (
              <span className="text-gray-400">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
