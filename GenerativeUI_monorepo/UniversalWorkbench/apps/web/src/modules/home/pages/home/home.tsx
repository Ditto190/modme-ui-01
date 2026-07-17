import { homePageStyles as styles } from './home.styles';

interface IFeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

function FeatureCard({ title, description, icon }: IFeatureCardProps) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureCardBody}>
        <div className={styles.featureRow}>
          <div className={styles.featureIcon}>
            <span className={styles.featureIconText}>{icon}</span>
          </div>
          <div className={styles.featureContent}>
            <dt className={styles.featureTitle}>{title}</dt>
            <dd className={styles.featureDescription}>{description}</dd>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className={styles.page}>
      <div className="text-center">
        <h1 className={styles.heroTitle}>Welcome to the Adaptive Template</h1>
        <p className={styles.heroSubtitle}>
          A production-ready TypeScript fullstack template with AI agents,
          type-safe routing, and modern tooling.
        </p>
        <div className={styles.heroActions}>
          <div className="rounded-md shadow">
            <a href="/users" className={styles.primaryCta}>
              View Users
            </a>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className={styles.sectionTitle}>Stack Overview</h2>
        <div className={styles.featureGrid}>
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
