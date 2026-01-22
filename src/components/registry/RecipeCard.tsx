/**
 * Recipe Card Component
 *
 * Display and execute workflow recipes
 */

'use client';

import { useState } from 'react';
import { Play, Clock, Tag, ChevronRight } from 'lucide-react';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
}

export interface RecipeCardProps {
  recipe: Recipe;
  onExecute?: (recipeId: string) => void;
  baseUrl?: string;
}

export function RecipeCard({ recipe, onExecute, baseUrl = 'http://localhost:8000' }: RecipeCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch(`${baseUrl}/api/recipes/${recipe.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} }),
      });

      if (response.ok) {
        const result = await response.json();
        setExecutionResult(result);
        onExecute?.(recipe.id);
      } else {
        setExecutionResult({ status: 'error', message: 'Execution failed' });
      }
    } catch (error) {
      console.error('Error executing recipe:', error);
      setExecutionResult({ status: 'error', message: String(error) });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {recipe.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {recipe.description}
          </p>
        </div>
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
          {recipe.category}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>v{recipe.version}</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>{recipe.tags.slice(0, 2).join(', ')}</span>
            {recipe.tags.length > 2 && <span>+{recipe.tags.length - 2}</span>}
          </div>
        )}
      </div>

      {executionResult && (
        <div className={`mb-3 p-2 rounded text-sm ${
          executionResult.status === 'completed'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {executionResult.status === 'completed'
            ? '✓ Recipe executed successfully'
            : `✗ ${executionResult.message || 'Execution failed'}`}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
      >
        {isExecuting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Execute Recipe
          </>
        )}
      </button>
    </div>
  );
}
