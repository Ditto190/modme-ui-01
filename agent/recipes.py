"""Workflow templates (recipe) system for reusable task automation.

Integrates patterns from Goose for template-based automation.
Enables saving, editing, and replaying common consulting workflows.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from google.adk.tools import ToolContext


@dataclass
class RecipeStep:
    """A single step in a recipe."""

    id: str
    tool_name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    condition: Optional[str] = None  # Optional condition for execution
    on_error: str = "stop"  # stop, continue, retry


@dataclass
class Recipe:
    """A workflow recipe (template)."""

    id: str
    name: str
    description: str
    category: str
    steps: List[RecipeStep]
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    version: str = "1.0.0"
    author: str = "user"
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert recipe to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "steps": [
                {
                    "id": step.id,
                    "tool_name": step.tool_name,
                    "description": step.description,
                    "parameters": step.parameters,
                    "condition": step.condition,
                    "on_error": step.on_error,
                }
                for step in self.steps
            ],
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
            "author": self.author,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Recipe:
        """Create recipe from dictionary."""
        steps = [
            RecipeStep(
                id=step["id"],
                tool_name=step["tool_name"],
                description=step["description"],
                parameters=step.get("parameters", {}),
                condition=step.get("condition"),
                on_error=step.get("on_error", "stop"),
            )
            for step in data["steps"]
        ]

        return cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            category=data["category"],
            steps=steps,
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            version=data.get("version", "1.0.0"),
            author=data.get("author", "user"),
            tags=data.get("tags", []),
        )


class RecipeExecutor:
    """Executes recipe workflows."""

    def __init__(self, tool_registry: Dict[str, Any]):
        """Initialize recipe executor.

        Args:
            tool_registry: Registry of available tools
        """
        self.tool_registry = tool_registry
        self.execution_history: List[Dict[str, Any]] = []

    async def execute_recipe(
        self, recipe: Recipe, tool_context: ToolContext, variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Execute a recipe workflow.

        Args:
            recipe: Recipe to execute
            tool_context: Tool context for execution
            variables: Optional variables for parameterization

        Returns:
            Execution result
        """
        variables = variables or {}
        results = []
        execution_id = str(uuid4())

        execution_log = {
            "execution_id": execution_id,
            "recipe_id": recipe.id,
            "recipe_name": recipe.name,
            "started_at": datetime.utcnow().isoformat(),
            "steps": [],
        }

        try:
            for step in recipe.steps:
                # Check condition if present
                if step.condition and not self._evaluate_condition(
                    step.condition, variables, results
                ):
                    step_result = {
                        "step_id": step.id,
                        "tool_name": step.tool_name,
                        "status": "skipped",
                        "reason": f"Condition not met: {step.condition}",
                    }
                    results.append(step_result)
                    execution_log["steps"].append(step_result)
                    continue

                # Execute step
                try:
                    step_result = await self._execute_step(
                        step, tool_context, variables
                    )
                    results.append(step_result)
                    execution_log["steps"].append(step_result)

                    # Update variables with result
                    variables[f"step_{step.id}_result"] = step_result.get("result")

                except Exception as e:
                    error_result = {
                        "step_id": step.id,
                        "tool_name": step.tool_name,
                        "status": "error",
                        "error": str(e),
                    }
                    results.append(error_result)
                    execution_log["steps"].append(error_result)

                    # Handle error based on on_error strategy
                    if step.on_error == "stop":
                        execution_log["status"] = "failed"
                        execution_log["completed_at"] = datetime.utcnow().isoformat()
                        self.execution_history.append(execution_log)
                        return {
                            "status": "failed",
                            "execution_id": execution_id,
                            "error": str(e),
                            "results": results,
                        }
                    elif step.on_error == "continue":
                        continue
                    elif step.on_error == "retry":
                        # Simple retry logic (could be enhanced)
                        try:
                            step_result = await self._execute_step(
                                step, tool_context, variables
                            )
                            results.append(step_result)
                        except Exception:
                            continue

            execution_log["status"] = "completed"
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            self.execution_history.append(execution_log)

            return {
                "status": "completed",
                "execution_id": execution_id,
                "results": results,
            }

        except Exception as e:
            execution_log["status"] = "failed"
            execution_log["error"] = str(e)
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            self.execution_history.append(execution_log)

            return {
                "status": "failed",
                "execution_id": execution_id,
                "error": str(e),
                "results": results,
            }

    async def _execute_step(
        self, step: RecipeStep, tool_context: ToolContext, variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single recipe step.

        Args:
            step: Recipe step
            tool_context: Tool context
            variables: Variables for parameterization

        Returns:
            Step execution result
        """
        tool_name = step.tool_name

        if tool_name not in self.tool_registry:
            raise ValueError(f"Tool not found: {tool_name}")

        tool_func = self.tool_registry[tool_name]

        # Substitute variables in parameters
        parameters = self._substitute_variables(step.parameters, variables)

        # Execute tool
        try:
            result = tool_func(tool_context, **parameters)

            # Handle async functions
            import asyncio

            if asyncio.iscoroutine(result):
                result = await result

            return {
                "step_id": step.id,
                "tool_name": tool_name,
                "status": "success",
                "result": result,
            }

        except Exception as e:
            raise RuntimeError(f"Step {step.id} failed: {str(e)}")

    def _substitute_variables(
        self, parameters: Dict[str, Any], variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Substitute variables in parameters.

        Args:
            parameters: Original parameters
            variables: Variable values

        Returns:
            Parameters with variables substituted
        """
        substituted = {}

        for key, value in parameters.items():
            if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                # Variable reference: ${var_name}
                var_name = value[2:-1]
                substituted[key] = variables.get(var_name, value)
            else:
                substituted[key] = value

        return substituted

    def _evaluate_condition(
        self, condition: str, variables: Dict[str, Any], results: List[Dict[str, Any]]
    ) -> bool:
        """Evaluate a step condition.

        Args:
            condition: Condition expression
            variables: Current variables
            results: Previous step results

        Returns:
            True if condition is met
        """
        # Simple condition evaluation (could be enhanced with proper parser)
        # For now, support basic checks like:
        # - "previous_success": Check if previous step succeeded
        # - "${var_name} == value": Check variable value

        if condition == "previous_success":
            if results:
                last_result = results[-1]
                return last_result.get("status") == "success"
            return True

        # More complex conditions could be added here
        return True


class RecipeManager:
    """Manages recipe storage and retrieval."""

    def __init__(self, recipes_dir: Path):
        """Initialize recipe manager.

        Args:
            recipes_dir: Directory for storing recipes
        """
        self.recipes_dir = recipes_dir
        self.recipes_dir.mkdir(parents=True, exist_ok=True)
        self.recipes: Dict[str, Recipe] = {}
        self.load_all_recipes()

    def load_all_recipes(self):
        """Load all recipes from disk."""
        for recipe_file in self.recipes_dir.glob("*.json"):
            try:
                recipe_data = json.loads(recipe_file.read_text())
                recipe = Recipe.from_dict(recipe_data)
                self.recipes[recipe.id] = recipe
            except Exception as e:
                print(f"Error loading recipe {recipe_file}: {e}")

    def save_recipe(self, recipe: Recipe):
        """Save a recipe to disk.

        Args:
            recipe: Recipe to save
        """
        recipe.updated_at = datetime.utcnow().isoformat()
        recipe_file = self.recipes_dir / f"{recipe.id}.json"
        recipe_file.write_text(json.dumps(recipe.to_dict(), indent=2))
        self.recipes[recipe.id] = recipe

    def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        """Get a recipe by ID.

        Args:
            recipe_id: Recipe ID

        Returns:
            Recipe if found, None otherwise
        """
        return self.recipes.get(recipe_id)

    def list_recipes(
        self, category: Optional[str] = None, tags: Optional[List[str]] = None
    ) -> List[Recipe]:
        """List recipes with optional filtering.

        Args:
            category: Optional category filter
            tags: Optional tag filter

        Returns:
            List of matching recipes
        """
        recipes = list(self.recipes.values())

        if category:
            recipes = [r for r in recipes if r.category == category]

        if tags:
            recipes = [r for r in recipes if any(tag in r.tags for tag in tags)]

        return sorted(recipes, key=lambda r: r.updated_at, reverse=True)

    def delete_recipe(self, recipe_id: str):
        """Delete a recipe.

        Args:
            recipe_id: Recipe ID
        """
        if recipe_id in self.recipes:
            recipe_file = self.recipes_dir / f"{recipe_id}.json"
            if recipe_file.exists():
                recipe_file.unlink()
            del self.recipes[recipe_id]

    def create_recipe(
        self,
        name: str,
        description: str,
        category: str,
        steps: List[RecipeStep],
        tags: List[str] = None,
    ) -> Recipe:
        """Create a new recipe.

        Args:
            name: Recipe name
            description: Recipe description
            category: Recipe category
            steps: Recipe steps
            tags: Optional tags

        Returns:
            Created recipe
        """
        recipe = Recipe(
            id=str(uuid4()),
            name=name,
            description=description,
            category=category,
            steps=steps,
            tags=tags or [],
        )

        self.save_recipe(recipe)
        return recipe


# Global recipe manager instance
_recipe_manager: Optional[RecipeManager] = None


def get_recipe_manager(recipes_dir: Optional[Path] = None) -> RecipeManager:
    """Get or create the global recipe manager."""
    global _recipe_manager
    if _recipe_manager is None:
        if recipes_dir is None:
            recipes_dir = Path("agent/recipes")
        _recipe_manager = RecipeManager(recipes_dir)
    return _recipe_manager
