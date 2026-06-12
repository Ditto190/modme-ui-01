import { createFileRoute } from '@tanstack/react-router';
import { queryKeys } from '../lib/api-hooks.js';

export const Route = createFileRoute('/posts')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: queryKeys.posts.list(),
      queryFn: async () => {
        const response = await fetch('http://localhost:3000/api/posts');
        const data = await response.json();
        return data.posts;
      },
    }),
});
