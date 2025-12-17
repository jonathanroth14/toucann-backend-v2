'use client';

import { useState, useEffect } from 'react';
import { adminApi, goalAdminApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  goal_id: number | null;
  next_challenge_id: number | null;
  sort_order: number;
  visible_to_students: boolean;
  points: number;
  category: string | null;
  due_date: string | null;
  start_date: string | null;
  expires_at: string | null;
  recurrence_days: number | null;
  recurrence_limit: number | null;
  recurrence_count: number;
  original_challenge_id: number | null;
}

interface Goal {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
}

export default function AdminChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    goal_id: '',
    next_challenge_id: '',
    sort_order: 0,
    visible_to_students: true,
    points: 10,
    category: '',
    due_date: '',
    start_date: '',
    expires_at: '',
    recurrence_days: '',
    recurrence_limit: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [challengesData, goalsData] = await Promise.all([
        adminApi.listChallenges(),
        goalAdminApi.listGoals(),
      ]);
      setChallenges(challengesData);
      setGoals(goalsData);
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await adminApi.createChallenge({
        title: formData.title,
        description: formData.description || undefined,
        is_active: formData.is_active,
        goal_id: formData.goal_id ? parseInt(formData.goal_id) : undefined,
        next_challenge_id: formData.next_challenge_id ? parseInt(formData.next_challenge_id) : undefined,
        sort_order: formData.sort_order,
        visible_to_students: formData.visible_to_students,
        points: formData.points,
        category: formData.category || undefined,
        due_date: formData.due_date || undefined,
        start_date: formData.start_date || undefined,
        expires_at: formData.expires_at || undefined,
        recurrence_days: formData.recurrence_days ? parseInt(formData.recurrence_days) : undefined,
        recurrence_limit: formData.recurrence_limit ? parseInt(formData.recurrence_limit) : undefined,
      });

      setFormData({
        title: '',
        description: '',
        is_active: true,
        goal_id: '',
        next_challenge_id: '',
        sort_order: 0,
        visible_to_students: true,
        points: 10,
        category: '',
        due_date: '',
        start_date: '',
        expires_at: '',
        recurrence_days: '',
        recurrence_limit: '',
      });
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChallenge = async (id: number) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      await adminApi.deleteChallenge(id);
      await loadData();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Manage Challenges</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/goals')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Manage Goals
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showCreateForm ? 'Cancel' : '+ Create Challenge'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Create and manage daily challenges. Link challenges to goals for the two-tier learning system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Challenge</h2>
          <form onSubmit={handleCreateChallenge} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add one more target school"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Goal
                </label>
                <select
                  value={formData.goal_id}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Why this challenge matters..."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Scheduling and Recurrence Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Scheduling & Recurrence (Optional)
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Set when this challenge becomes available, when it expires, and whether it should recur automatically.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Available From)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">When challenge becomes visible to students</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires At (If Not Completed)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">When challenge disappears if incomplete</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence Days (Days to Reappear)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 7 for weekly, 1 for daily"
                    value={formData.recurrence_days}
                    onChange={(e) => setFormData({ ...formData, recurrence_days: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many days until challenge reappears</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence Limit (Max Times)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    value={formData.recurrence_limit}
                    onChange={(e) => setFormData({ ...formData, recurrence_limit: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of times to recur (blank = infinite)</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.visible_to_students}
                  onChange={(e) => setFormData({ ...formData, visible_to_students: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Visible to Students</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creating ? 'Creating...' : 'Create Challenge'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {challenges.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No challenges yet. Create your first challenge!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              + Create Challenge
            </button>
          </div>
        ) : (
          challenges.map((challenge) => {
            const linkedGoal = goals.find(g => g.id === challenge.goal_id);

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{challenge.title}</h3>
                      {challenge.is_active && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                      {challenge.visible_to_students && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          Visible
                        </span>
                      )}
                    </div>

                    {challenge.description && (
                      <p className="text-gray-600 mb-3">{challenge.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {linkedGoal && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Goal:</span> {linkedGoal.title}
                        </span>
                      )}
                      <span>Sort: {challenge.sort_order}</span>
                      <span>{challenge.points} pts</span>
                      {challenge.category && <span>{challenge.category}</span>}
                      {challenge.due_date && (
                        <span>Due: {new Date(challenge.due_date).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Scheduling Info */}
                    {(challenge.start_date || challenge.expires_at || challenge.recurrence_days) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {challenge.start_date && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Starts:</span>
                              {new Date(challenge.start_date).toLocaleString()}
                            </span>
                          )}
                          {challenge.expires_at && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Expires:</span>
                              {new Date(challenge.expires_at).toLocaleString()}
                            </span>
                          )}
                          {challenge.recurrence_days && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Recurs:</span>
                              Every {challenge.recurrence_days} day{challenge.recurrence_days !== 1 ? 's' : ''}
                              {challenge.recurrence_limit && ` (max ${challenge.recurrence_limit}x)`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/challenges/${challenge.id}`)}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
