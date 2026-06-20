import { Button } from '@adaptiveworx/ui';
import { createLazyFileRoute } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useCreatePost, useDeletePost, usePosts, useUsers } from '../lib/api-hooks.js';

export const Route = createLazyFileRoute('/posts')({
  component: PostsPage,
});

function PostsPage() {
  const { data: posts, isLoading, error } = usePosts();
  const { data: users } = useUsers();
  const createPostMutation = useCreatePost();
  const deletePostMutation = useDeletePost();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', authorId: '' });
  const authorId = useId();
  const titleId = useId();
  const contentId = useId();

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPostMutation.mutateAsync(formData);
    setFormData({ title: '', content: '', authorId: '' });
    setShowCreateForm(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePostMutation.mutateAsync(postId);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-red-600">Error loading posts: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Posts</h1>
          <p className="mt-2 text-sm text-gray-700">
            All posts in your application with their authors.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>Create Post</Button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Create New Post</h3>
            <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
              <div>
                <label htmlFor={authorId} className="block text-sm font-medium text-gray-700">
                  Author
                </label>
                <select
                  id={authorId}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.authorId}
                  onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
                >
                  <option value="">Select an author</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={titleId} className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id={titleId}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={contentId} className="block text-sm font-medium text-gray-700">
                  Content (optional)
                </label>
                <textarea
                  id={contentId}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" disabled={createPostMutation.isPending}>
                  {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ title: '', content: '', authorId: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {posts?.map((post) => (
          <div key={post.id} className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">{post.title}</h3>
              {post.content && <p className="mt-2 text-sm text-gray-600">{post.content}</p>}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span>By {post.author?.name || post.author?.email}</span>
                  <span className="mx-2">·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePost(post.id)}
                  disabled={deletePostMutation.isPending}
                  className="text-sm text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
