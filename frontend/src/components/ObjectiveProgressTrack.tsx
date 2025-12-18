'use client';

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

interface ObjectiveProgressTrackProps {
  goalTitle: string;
  objectives: Objective[];
  currentObjectiveId: number | null;
}

export default function ObjectiveProgressTrack({
  goalTitle,
  objectives,
  currentObjectiveId,
}: ObjectiveProgressTrackProps) {
  if (objectives.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Path: {goalTitle}</h4>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {objectives.map((objective, index) => {
          const isCompleted = objective.is_completed;
          const isCurrent = objective.id === currentObjectiveId;
          const isLocked = !isCompleted && !isCurrent;

          return (
            <div key={objective.id} className="flex items-center flex-shrink-0">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
                      : isCurrent
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg ring-4 ring-indigo-100'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                  title={objective.title}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Optional: Show title below for current step */}
                {isCurrent && (
                  <div className="mt-1 text-xs font-medium text-indigo-600 max-w-[60px] text-center truncate">
                    {objective.title}
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < objectives.length - 1 && (
                <div
                  className={`h-1 w-8 mx-1 rounded ${
                    isCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-500"></div>
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <span>Locked</span>
          </div>
        </div>
        <span className="font-medium text-gray-600">
          {objectives.filter(o => o.is_completed).length} / {objectives.length}
        </span>
      </div>
    </div>
  );
}
