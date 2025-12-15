'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

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

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = parseInt(params.id as string);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Objective form state
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [objTitle, setObjTitle] = useState('');
  const [objDescription, setObjDescription] = useState('');
  const [objPoints, setObjPoints] = useState(10);
  const [objSortOrder, setObjSortOrder] = useState(1);
  const [objRequired, setObjRequired] = useState(true);
  const [creatingObj, setCreatingObj] = useState(false);

  // Link form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [nextChallengeId, setNextChallengeId] = useState('');
  const [linkCondition, setLinkCondition] = useState('ON_COMPLETE');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      const data = await adminApi.getChallenge(challengeId);
      setChallenge(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingObj(true);
    setError('');

    try {
      await adminApi.createObjective(challengeId, {
        title: objTitle,
        description: objDescription || undefined,
        points: objPoints,
        sort_order: objSortOrder,
        is_required: objRequired,
      });

      // Reset form
      setObjTitle('');
      setObjDescription('');
      setObjPoints(10);
      setObjSortOrder(challenge ? challenge.objectives.length + 1 : 1);
      setObjRequired(true);
      setShowObjectiveForm(false);

      // Reload challenge
      await loadChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create objective');
    } finally {
      setCreatingObj(false);
    }
  };

  const handleLinkNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setError('');

    try {
      await adminApi.linkNextChallenge(challengeId, parseInt(nextChallengeId), linkCondition);
      setNextChallengeId('');
      setShowLinkForm(false);
      alert('Challenge linked successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link challenge');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">Challenge not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/admin/challenges')}
        className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
      >
        ← Back to Challenges
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{challenge.title}</h1>
        {challenge.description && (
          <p className="text-gray-600 mb-4">{challenge.description}</p>
        )}
        <div className="flex items-center space-x-4 text-sm">
          <span
            className={`px-2 py-1 rounded ${
              challenge.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {challenge.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="text-gray-500">ID: {challenge.id}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Objectives</h2>
          <button
            onClick={() => setShowObjectiveForm(!showObjectiveForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            {showObjectiveForm ? 'Cancel' : 'Add Objective'}
          </button>
        </div>

        {showObjectiveForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Objective</h3>
            <form onSubmit={handleCreateObjective} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={objDescription}
                  onChange={(e) => setObjDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={objPoints}
                    onChange={(e) => setObjPoints(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={objSortOrder}
                    onChange={(e) => setObjSortOrder(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="objRequired"
                  checked={objRequired}
                  onChange={(e) => setObjRequired(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="objRequired" className="ml-2 text-sm text-gray-700">
                  Required for completion
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingObj}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creatingObj ? 'Creating...' : 'Create Objective'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {challenge.objectives.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              No objectives yet. Add one to get started.
            </div>
          ) : (
            challenge.objectives
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((obj) => (
                <div key={obj.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{obj.title}</h4>
                      {obj.description && (
                        <p className="text-sm text-gray-600 mt-1">{obj.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{obj.points} points</span>
                        <span>Order: {obj.sort_order}</span>
                        <span className={obj.is_required ? 'text-red-600' : ''}>
                          {obj.is_required ? 'Required' : 'Optional'}
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
          <h2 className="text-2xl font-bold text-gray-900">Challenge Chaining</h2>
          <button
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700"
          >
            {showLinkForm ? 'Cancel' : 'Link Next Challenge'}
          </button>
        </div>

        {showLinkForm && (
          <form onSubmit={handleLinkNext} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Challenge ID *
              </label>
              <input
                type="number"
                value={nextChallengeId}
                onChange={(e) => setNextChallengeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter challenge ID"
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
                <option value="ON_COMPLETE">ON_COMPLETE</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={linking}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {linking ? 'Linking...' : 'Link Challenge'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-600 mt-4">
          Link this challenge to another challenge that will automatically become active when
          this one is completed.
        </p>
      </div>
    </div>
  );
}
