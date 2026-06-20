import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to the Adaptive Template
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          A production-ready TypeScript fullstack template with AI agents, type-safe routing, and
          modern tooling.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <a
              href="/users"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              View Users
            </a>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">Stack Overview</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Type-Safe Everything"
            description="TanStack Router + Query for end-to-end type safety from database to UI"
            icon="🔒"
          />
          <FeatureCard
            title="AI Agent Ready"
            description="MCP-compatible agent service with tools and workflows"
            icon="🤖"
          />
          <FeatureCard
            title="Modern Tooling"
            description="Turborepo, Biome, Vitest, and Drizzle ORM for peak productivity"
            icon="⚡"
          />
          <FeatureCard
            title="Secrets Management"
            description="Infisical SDK integration for secure secrets handling"
            icon="🔐"
          />
          <FeatureCard
            title="Monorepo Structure"
            description="Organized apps and packages for scalable development"
            icon="📦"
          />
          <FeatureCard
            title="Full Stack TypeScript"
            description="Type safety from database schemas to API contracts to UI"
            icon="📝"
          />
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-3xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="mt-1 text-sm text-gray-900">{description}</dd>
          </div>
        </div>
      </div>
    </div>
  );
}
