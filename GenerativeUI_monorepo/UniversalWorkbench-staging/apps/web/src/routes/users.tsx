import { createFileRoute } from '@tanstack/react-router';
import { queryKeys } from '../lib/api-hooks.js';

export const Route = createFileRoute('/users')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: queryKeys.users.list(),
      queryFn: async () => {
        const response = await fetch('http://localhost:3000/api/users');
        const data = await response.json();
        return data.users;
      },
    }),
});
