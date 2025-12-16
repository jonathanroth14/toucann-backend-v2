'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
}

interface Goal {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  objectives: Challenge[];
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = parseInt(params.id as string);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Challenge form state
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengePoints, setChallengePoints] = useState(10);
  const [challengeSortOrder, setChallengeSortOrder] = useState(1);
  const [challengeRequired, setChallengeRequired] = useState(true);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Link form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [nextGoalId, setNextGoalId] = useState('');
  const [linkCondition, setLinkCondition] = useState('ON_COMPLETE');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const data = await adminApi.getChallenge(goalId);
      setGoal(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingChallenge(true);
    setError('');

    try {
      await adminApi.createObjective(goalId, {
        title: challengeTitle,
        description: challengeDescription || undefined,
        points: challengePoints,
        sort_order: challengeSortOrder,
        is_required: challengeRequired,
      });

      // Reset form
      setChallengeTitle('');
      setChallengeDescription('');
      setChallengePoints(10);
      setChallengeSortOrder(goal ? goal.objectives.length + 1 : 1);
      setChallengeRequired(true);
      setShowChallengeForm(false);

      // Reload goal
      await loadGoal();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleLinkNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setError('');

    try {
      await adminApi.linkNextChallenge(goalId, parseInt(nextGoalId), linkCondition);
      setNextGoalId('');
      setShowLinkForm(false);
      alert('Next goal linked successfully!');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading goal...</div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">Goal not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/admin/goals')}
        className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
      >
        ← Back to Goals
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{goal.title}</h1>
        {goal.description && (
          <p className="text-gray-600 mb-4">{goal.description}</p>
        )}
        <div className="flex items-center space-x-4 text-sm">
          <span
            className={`px-2 py-1 rounded ${
              goal.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {goal.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="text-gray-500">ID: {goal.id}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Challenges</h2>
            <p className="text-sm text-gray-600 mt-1">Quick wins that move this goal forward</p>
          </div>
          <button
            onClick={() => setShowChallengeForm(!showChallengeForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            {showChallengeForm ? 'Cancel' : 'Add Challenge'}
          </button>
        </div>

        {showChallengeForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Challenge</h3>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's the next step?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={challengeDescription}
                  onChange={(e) => setChallengeDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Keep it simple and actionable"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={challengePoints}
                    onChange={(e) => setChallengePoints(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={challengeSortOrder}
                    onChange={(e) => setChallengeSortOrder(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="challengeRequired"
                  checked={challengeRequired}
                  onChange={(e) => setChallengeRequired(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="challengeRequired" className="ml-2 text-sm text-gray-700">
                  Required to complete this goal
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingChallenge}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creatingChallenge ? 'Adding...' : 'Add Challenge'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {goal.objectives.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              No challenges yet. Add one to help students make progress toward this goal.
            </div>
          ) : (
            goal.objectives
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((challenge) => (
                <div key={challenge.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{challenge.title}</h4>
                      {challenge.description && (
                        <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{challenge.points} points</span>
                        <span>Order: {challenge.sort_order}</span>
                        <span className={challenge.is_required ? 'text-red-600' : ''}>
                          {challenge.is_required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Goal Progression</h2>
            <p className="text-sm text-gray-600 mt-1">What comes next?</p>
          </div>
          <button
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700"
          >
            {showLinkForm ? 'Cancel' : 'Link Next Goal'}
          </button>
        </div>

        {showLinkForm && (
          <form onSubmit={handleLinkNext} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Goal ID *
              </label>
              <input
                type="number"
                value={nextGoalId}
                onChange={(e) => setNextGoalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter goal ID to unlock next"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={linkCondition}
                onChange={(e) => setLinkCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="ON_COMPLETE">When this goal is complete</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={linking}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {linking ? 'Linking...' : 'Link Goal'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-600 mt-4">
          Chain goals together to create a learning path. When students complete this goal, the next one will unlock automatically.
        </p>
      </div>
    </div>
  );
}
