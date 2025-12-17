'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { goalAdminApi } from '@/lib/api';
import { formatApiError } from '@/lib/errors';

interface Goal {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  start_date: string | null;
  expires_at: string | null;
  recurrence_days: number | null;
  recurrence_limit: number | null;
  recurrence_count: number;
  original_goal_id: number | null;
}

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState('');
  const [recurrenceLimit, setRecurrenceLimit] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editStartDate, setEditStartDate] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editRecurrenceDays, setEditRecurrenceDays] = useState('');
  const [editRecurrenceLimit, setEditRecurrenceLimit] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setError('');
    try {
      const data = await goalAdminApi.listGoals();
      console.log('📋 Loaded goals:', data);
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = formatApiError(err);
      setError(errorMsg);
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    const goalData = {
      title: title.trim(),
      description: description.trim() || undefined,
      is_active: isActive,
      start_date: startDate || undefined,
      expires_at: expiresAt || undefined,
      recurrence_days: recurrenceDays ? parseInt(recurrenceDays) : undefined,
      recurrence_limit: recurrenceLimit ? parseInt(recurrenceLimit) : undefined,
    };

    console.log('Creating goal:', goalData);

    try {
      const result = await goalAdminApi.createGoal(goalData);
      console.log('✅ Goal created:', result);

      // Reset form
      setTitle('');
      setDescription('');
      setIsActive(true);
      setStartDate('');
      setExpiresAt('');
      setRecurrenceDays('');
      setRecurrenceLimit('');
      setShowForm(false);

      // Show success message
      setSuccess(`Goal "${result.title}" created successfully!`);

      // Reload goals
      await loadGoals();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMsg = formatApiError(err);
      setError(errorMsg);
      console.error('Failed to create goal:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditIsActive(goal.is_active);
    setEditStartDate(goal.start_date || '');
    setEditExpiresAt(goal.expires_at || '');
    setEditRecurrenceDays(goal.recurrence_days?.toString() || '');
    setEditRecurrenceLimit(goal.recurrence_limit?.toString() || '');
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    const updateData = {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      is_active: editIsActive,
      start_date: editStartDate || undefined,
      expires_at: editExpiresAt || undefined,
      recurrence_days: editRecurrenceDays ? parseInt(editRecurrenceDays) : undefined,
      recurrence_limit: editRecurrenceLimit ? parseInt(editRecurrenceLimit) : undefined,
    };

    try {
      const result = await goalAdminApi.updateGoal(editingGoal.id, updateData);
      console.log('✅ Goal updated:', result);

      // Close modal
      setEditingGoal(null);

      // Show success message
      setSuccess(`Goal "${result.title}" updated successfully!`);

      // Reload goals
      await loadGoals();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMsg = formatApiError(err);
      setError(errorMsg);
      console.error('Failed to update goal:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (goalId: number) => {
    setDeletingId(goalId);
    setError('');
    setSuccess('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const result = await goalAdminApi.deleteGoal(deletingId);
      console.log('✅ Goal deleted:', result);

      // Close confirmation
      setDeletingId(null);

      // Show success message
      setSuccess(result.message || 'Goal deleted successfully!');

      // Reload goals
      await loadGoals();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMsg = formatApiError(err);
      setError(errorMsg);
      console.error('Failed to delete goal:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading your goals...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError('');
            setSuccess('');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Goal'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="text-green-700 hover:text-green-900"
          >
            ✕
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Goal</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What's the big picture?"
                required
                minLength={3}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what success looks like for this goal"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (visible to students)
              </label>
            </div>

            {/* Scheduling and Recurrence Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Scheduling & Recurrence (Optional)
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Set when this goal becomes available, when it expires, and whether it should recur automatically.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Available From)
                  </label>
                  <input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">When goal becomes visible to students</p>
                </div>

                <div>
                  <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-1">
                    Expires At (If Not Completed)
                  </label>
                  <input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">When goal disappears if incomplete</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recurrenceDays" className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence Days (Days to Reappear)
                  </label>
                  <input
                    id="recurrenceDays"
                    type="number"
                    min="0"
                    placeholder="e.g., 7 for weekly, 30 for monthly"
                    value={recurrenceDays}
                    onChange={(e) => setRecurrenceDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many days until goal reappears</p>
                </div>

                <div>
                  <label htmlFor="recurrenceLimit" className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence Limit (Max Times)
                  </label>
                  <input
                    id="recurrenceLimit"
                    type="number"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    value={recurrenceLimit}
                    onChange={(e) => setRecurrenceLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of times to recur (blank = infinite)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Goal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setTitle('');
                  setDescription('');
                  setIsActive(true);
                  setStartDate('');
                  setExpiresAt('');
                  setRecurrenceDays('');
                  setRecurrenceLimit('');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Goal</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="editTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What's the big picture?"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what success looks like for this goal"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsActive" className="ml-2 text-sm text-gray-700">
                    Active (visible to students)
                  </label>
                </div>

                {/* Scheduling and Recurrence Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Scheduling & Recurrence (Optional)
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Set when this goal becomes available, when it expires, and whether it should recur automatically.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date (Available From)
                      </label>
                      <input
                        id="editStartDate"
                        type="datetime-local"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">When goal becomes visible to students</p>
                    </div>

                    <div>
                      <label htmlFor="editExpiresAt" className="block text-sm font-medium text-gray-700 mb-1">
                        Expires At (If Not Completed)
                      </label>
                      <input
                        id="editExpiresAt"
                        type="datetime-local"
                        value={editExpiresAt}
                        onChange={(e) => setEditExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">When goal disappears if incomplete</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="editRecurrenceDays" className="block text-sm font-medium text-gray-700 mb-1">
                        Recurrence Days (Days to Reappear)
                      </label>
                      <input
                        id="editRecurrenceDays"
                        type="number"
                        min="0"
                        placeholder="e.g., 7 for weekly, 30 for monthly"
                        value={editRecurrenceDays}
                        onChange={(e) => setEditRecurrenceDays(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">How many days until goal reappears</p>
                    </div>

                    <div>
                      <label htmlFor="editRecurrenceLimit" className="block text-sm font-medium text-gray-700 mb-1">
                        Recurrence Limit (Max Times)
                      </label>
                      <input
                        id="editRecurrenceLimit"
                        type="number"
                        min="0"
                        placeholder="Leave empty for unlimited"
                        value={editRecurrenceLimit}
                        onChange={(e) => setEditRecurrenceLimit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum number of times to recur (blank = infinite)</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={updating || !editTitle.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? 'Updating...' : 'Update Goal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGoal(null)}
                    disabled={updating}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Goal?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this goal? This will also delete all associated challenges, links, and student progress. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {!goals || goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-gray-600 mb-4">No goals yet. Create one to get started.</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Create First Goal
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-2">
              {goals.length} goal{goals.length !== 1 ? 's' : ''} found
            </div>
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-gray-600 mb-3">{goal.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded font-medium ${
                          goal.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {goal.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span>ID: {goal.id}</span>
                      <span>Created: {new Date(goal.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Scheduling Info */}
                    {(goal.start_date || goal.expires_at || goal.recurrence_days) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {goal.start_date && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Starts:</span>
                              {new Date(goal.start_date).toLocaleString()}
                            </span>
                          )}
                          {goal.expires_at && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Expires:</span>
                              {new Date(goal.expires_at).toLocaleString()}
                            </span>
                          )}
                          {goal.recurrence_days && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Recurs:</span>
                              Every {goal.recurrence_days} day{goal.recurrence_days !== 1 ? 's' : ''}
                              {goal.recurrence_limit && ` (max ${goal.recurrence_limit}x)`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/goals/${goal.id}`)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleEdit(goal)}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md font-medium hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(goal.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-md font-medium hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
