'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

interface Objective {
  id: number;
  title: string;
  description: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  objectives: Objective[];
}

export default function AdminChallengeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = parseInt(params.id as string);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [allChallenges, setAllChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedNextChallengeId, setSelectedNextChallengeId] = useState<number | null>(null);

  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    description: '',
    points: 5,
    sort_order: 0,
    is_required: true,
  });

  useEffect(() => {
    loadData();
  }, [challengeId]);

  const loadData = async () => {
    try {
      const [challengeData, challengesData] = await Promise.all([
        adminApi.getChallenge(challengeId),
        adminApi.listChallenges(),
      ]);
      setChallenge(challengeData);
      setAllChallenges(challengesData);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadChallenge = async () => {
    try {
      const data = await adminApi.getChallenge(challengeId);
      setChallenge(data);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await adminApi.createObjective(challengeId, objectiveForm);
      setObjectiveForm({
        title: '',
        description: '',
        points: 5,
        sort_order: 0,
        is_required: true,
      });
      setShowObjectiveForm(false);
      await loadChallenge();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleLinkNextChallenge = async () => {
    if (!selectedNextChallengeId) {
      setError('Please select a challenge to link');
      return;
    }

    setLinking(true);
    setError('');

    try {
      await adminApi.linkNextChallenge(challengeId, selectedNextChallengeId);
      alert('Challenge linked successfully! This will be reflected when students complete this challenge.');
      setSelectedNextChallengeId(null);
      await loadData();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading challenge...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Challenge not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/challenges')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Challenges
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{challenge.title}</h1>
        {challenge.description && (
          <p className="text-gray-600 mb-4">{challenge.description}</p>
        )}

        <div className="flex items-center gap-3">
          {challenge.is_active && (
            <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded">
              Active
            </span>
          )}
          <span className="text-sm text-gray-500">
            Created {new Date(challenge.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Objectives</h2>
          <button
            onClick={() => setShowObjectiveForm(!showObjectiveForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showObjectiveForm ? 'Cancel' : '+ Add Objective'}
          </button>
        </div>

        {showObjectiveForm && (
          <form onSubmit={handleCreateObjective} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={objectiveForm.title}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Complete profile section"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={objectiveForm.description}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={objectiveForm.points}
                    onChange={(e) => setObjectiveForm({ ...objectiveForm, points: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={objectiveForm.sort_order}
                    onChange={(e) => setObjectiveForm({ ...objectiveForm, sort_order: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={objectiveForm.is_required}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, is_required: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {creating ? 'Creating...' : 'Add Objective'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowObjectiveForm(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {challenge.objectives.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No objectives yet. Add objectives to help students complete this challenge.
          </div>
        ) : (
          <div className="space-y-3">
            {challenge.objectives
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((objective) => (
                <div
                  key={objective.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{objective.title}</h3>
                        {objective.is_required && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      {objective.description && (
                        <p className="text-sm text-gray-600 mb-2">{objective.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Sort: {objective.sort_order}</span>
                        <span>{objective.points} points</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Link Next Challenge Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Challenge Chaining</h2>
        <p className="text-sm text-gray-600 mb-4">
          Link this challenge to another challenge that should automatically activate when students complete this one.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Challenge in Chain
            </label>
            <div className="flex gap-3">
              <select
                value={selectedNextChallengeId || ''}
                onChange={(e) => setSelectedNextChallengeId(e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- Select Next Challenge --</option>
                {allChallenges
                  .filter(ch => ch.id !== challengeId)
                  .map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title} (ID: {ch.id})
                    </option>
                  ))}
              </select>

              <button
                onClick={handleLinkNextChallenge}
                disabled={linking || !selectedNextChallengeId}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {linking ? 'Linking...' : 'Link Challenge'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">How Challenge Chaining Works:</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>When a student completes all required objectives in this challenge, it will be marked as complete.</li>
              <li>If a next challenge is linked, it will automatically become the student's active challenge.</li>
              <li>Students will see a preview of upcoming challenges in their "Your path today" progress track.</li>
              <li>Use chaining to create guided onboarding flows or learning sequences.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
