import { createLazyFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/modules/home';

export const Route = createLazyFileRoute('/')({
  component: HomePage,
});
