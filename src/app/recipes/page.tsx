/**
 * Recipe Marketplace Page
 *
 * Browse and execute workflow recipes
 */

'use client';

import { useState, useEffect } from 'react';
import { RecipeCard, Recipe } from '@/components/registry/RecipeCard';
import { Book, Search, Filter } from 'lucide-react';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [searchQuery, selectedCategory, recipes]);

  const loadRecipes = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/recipes`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((recipe) => recipe.category === selectedCategory);
    }

    setFilteredRecipes(filtered);
  };

  const categories = ['all', ...new Set(recipes.map((r) => r.category))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Recipe Marketplace
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Browse and execute pre-built workflow templates
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48" />
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                baseUrl={baseUrl}
                onExecute={(id) => {
                  console.log('Recipe executed:', id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No recipes found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
