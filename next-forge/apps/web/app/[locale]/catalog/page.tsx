"use client";

import { useState } from "react";

interface Agent {
  description: string;
  evalScore?: number;
  id: string;
  name: string;
  tools: string[];
}

// Mock data for initial implementation
const MOCK_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Code Reviewer Agent",
    description: "Analyzes code for quality, security, and best practices",
    tools: ["linter", "type-checker", "security-scanner"],
    evalScore: 92,
  },
  {
    id: "2",
    name: "API Designer Agent",
    description: "Designs RESTful APIs and OpenAPI specifications",
    tools: ["schema-validator", "api-tester", "documentation-generator"],
    evalScore: 88,
  },
  {
    id: "3",
    name: "Test Strategy Agent",
    description: "Plans and generates test cases for comprehensive coverage",
    tools: ["test-generator", "coverage-analyzer", "mutation-tester"],
    evalScore: 85,
  },
  {
    id: "4",
    name: "Performance Optimizer",
    description: "Identifies and fixes performance bottlenecks",
    tools: ["profiler", "bundle-analyzer", "metric-tracker"],
    evalScore: 90,
  },
  {
    id: "5",
    name: "Documentation Agent",
    description: "Creates comprehensive documentation and guides",
    tools: ["markdown-generator", "diagram-creator", "example-builder"],
    evalScore: 87,
  },
];

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filter agents by search query
  const filteredAgents = MOCK_AGENTS.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tools.some((tool) =>
        tool.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-2 font-bold text-4xl text-slate-900">
            Agent Catalog
          </h1>
          <p className="text-lg text-slate-600">
            Discover and request intelligent agents for your workflows
          </p>
        </div>

        {/* Search and Controls */}
        <div className="mb-8 flex flex-wrap gap-4">
          <input
            aria-label="Search agents"
            className="min-w-64 flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, capability, or tool..."
            type="text"
            value={searchQuery}
          />
          <button
            className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            onClick={() => setShowForm(!showForm)}
            type="button"
          >
            Request Agent
          </button>
        </div>

        {/* Request Form */}
        {showForm && (
          <form
            className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-md"
            data-testid="agent-request-form"
            onSubmit={(e) => {
              e.preventDefault();
              setShowForm(false);
            }}
          >
            <h2 className="mb-4 font-semibold text-xl">Request New Agent</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                aria-label="Agent name"
                className="rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Agent name"
                required
                type="text"
              />
              <input
                aria-label="Agent capabilities"
                className="rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Capabilities"
                required
                type="text"
              />
            </div>
            <textarea
              aria-label="Request description"
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description of your needs..."
              required
              rows={4}
            />
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
                type="submit"
              >
                Submit Request
              </button>
              <button
                className="rounded-lg bg-slate-300 px-6 py-2 font-medium text-slate-900 transition-colors hover:bg-slate-400"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <button
              className="agent-card w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-md transition-shadow hover:shadow-lg"
              data-testid="agent-item"
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              type="button"
            >
              <div className="p-6">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <h2 className="flex-1 font-semibold text-slate-900 text-xl">
                    {agent.name}
                  </h2>
                  {agent.evalScore && (
                    <div
                      className="ml-2 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-900 text-sm"
                      data-testid="eval-score"
                    >
                      {agent.evalScore}%
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-slate-600 text-sm">
                  {agent.description}
                </p>

                {/* Tools */}
                <div className="mb-4">
                  <p className="mb-2 font-semibold text-slate-500 text-xs uppercase">
                    Tools
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.tools.map((tool) => (
                      <span
                        className="inline-block rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 text-xs"
                        key={tool}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="mt-4 font-medium text-slate-900 text-sm">
                  View Details →
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && searchQuery && (
          <div className="py-12 text-center">
            <p className="text-lg text-slate-600">
              No agents found matching "{searchQuery}"
            </p>
            <button
              className="mt-4 font-medium text-blue-600 hover:text-blue-700"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedAgent(null)}
            type="button"
          />
          <div
            aria-labelledby="agent-detail-title"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
            role="dialog"
          >
            <div className="p-8">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2
                    className="mb-2 font-bold text-3xl text-slate-900"
                    id="agent-detail-title"
                  >
                    {selectedAgent.name}
                  </h2>
                  {selectedAgent.evalScore && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 text-sm">
                        Eval Score:
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-900">
                        {selectedAgent.evalScore}%
                      </span>
                    </div>
                  )}
                </div>
                <button
                  aria-label="Close modal"
                  className="font-bold text-2xl text-slate-500 hover:text-slate-700"
                  onClick={() => setSelectedAgent(null)}
                  type="button"
                >
                  ×
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="mb-2 font-semibold text-lg text-slate-900">
                  Description
                </h3>
                <p className="text-slate-600">{selectedAgent.description}</p>
              </div>

              {/* Available Tools */}
              <div className="mb-6">
                <h3 className="mb-3 font-semibold text-lg text-slate-900">
                  Available Tools
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAgent.tools.map((tool) => (
                    <div
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      key={tool}
                    >
                      <p className="font-medium text-slate-900">{tool}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-slate-200 border-t pt-6">
                <button
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                  onClick={() => {
                    setSelectedAgent(null);
                    setShowForm(true);
                  }}
                  type="button"
                >
                  Request This Agent
                </button>
                <button
                  className="flex-1 rounded-lg bg-slate-100 px-6 py-2 font-medium text-slate-900 transition-colors hover:bg-slate-200"
                  onClick={() => setSelectedAgent(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
