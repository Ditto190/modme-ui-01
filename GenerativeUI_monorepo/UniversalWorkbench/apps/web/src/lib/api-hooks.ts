import type { Post, PostWithAuthor, User, UserWithCounts } from '@adaptiveworx/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api as apiClient } from './api.js';

// Query keys factory for type-safe query key management
export const queryKeys = {
  all: ['api'] as const,
  users: {
    all: () => [...queryKeys.all, 'users'] as const,
    list: () => [...queryKeys.users.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.users.all(), 'detail', id] as const,
  },
  posts: {
    all: () => [...queryKeys.all, 'posts'] as const,
    list: () => [...queryKeys.posts.all(), 'list'] as const,
    byUser: (userId: string) => [...queryKeys.posts.all(), 'byUser', userId] as const,
    detail: (id: string) => [...queryKeys.posts.all(), 'detail', id] as const,
  },
} as const;

// User hooks
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const data = await apiClient.get<{ users: UserWithCounts[] }>('/users');
      return data.users;
    },
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const data = await apiClient.get<{ user: UserWithCounts }>(`/users/${userId}`);
      return data.user;
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newUser: { email: string; name?: string }) => {
      const data = await apiClient.post<{ user: User }>('/users', newUser);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const data = await apiClient.delete<{ user: User }>(`/users/${userId}`);
      return data.user;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(userId) });
    },
  });
}

// Post hooks
export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts.list(),
    queryFn: async () => {
      const data = await apiClient.get<{ posts: PostWithAuthor[] }>('/posts');
      return data.posts;
    },
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.posts.byUser(userId),
    queryFn: async () => {
      const data = await apiClient.get<{ posts: Post[] }>(`/users/${userId}/posts`);
      return data.posts;
    },
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: { title: string; content?: string; authorId: string }) => {
      const data = await apiClient.post<{ post: Post }>('/posts', newPost);
      return data.post;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.byUser(data.authorId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.authorId) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const data = await apiClient.delete<{ post: Post }>(`/posts/${postId}`);
      return data.post;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all() });
      if (data.authorId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.byUser(data.authorId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.authorId) });
      }
    },
  });
}

// Health check hook
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const data = await apiClient.get<{ status: string; timestamp: string }>('/health');
      return data;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}
