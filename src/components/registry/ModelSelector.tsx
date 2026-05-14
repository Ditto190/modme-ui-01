/**
 * Model Selector Component
 *
 * Select and manage LLM providers and models
 */

'use client';

import { useState, useEffect } from 'react';
import { Zap, DollarSign, TrendingUp } from 'lucide-react';

export interface LLMProvider {
  id: string;
  name: string;
  status: 'active' | 'available' | 'unavailable';
}

export interface LLMUsage {
  total_cost: number;
  total_tokens: number;
  total_calls: number;
  by_model: Record<string, {
    tokens: number;
    cost: number;
    calls: number;
  }>;
}

export interface ModelSelectorProps {
  baseUrl?: string;
  onModelChange?: (provider: string, model: string) => void;
}

export function ModelSelector({ baseUrl = 'http://localhost:8000', onModelChange }: ModelSelectorProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [usage, setUsage] = useState<LLMUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProviders();
    loadUsage();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/llm/providers`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/llm/usage`);
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    onModelChange?.(providerId, '');
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48" />
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5" />
        LLM Provider
      </h3>

      <div className="space-y-2 mb-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderChange(provider.id)}
            className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
              selectedProvider === provider.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {provider.name}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  provider.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {provider.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      {usage && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Usage Statistics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Cost</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ${usage.total_cost.toFixed(4)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Tokens</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {(usage.total_tokens / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Calls
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {usage.total_calls}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
