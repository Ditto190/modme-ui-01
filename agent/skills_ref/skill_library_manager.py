"""
Skill Library Manager - Integration with Ai-Agent-Skills Repository

This module provides utilities for managing a curated skill library from
the skillcreatorai/Ai-Agent-Skills repository, integrated with our existing
skills_ref infrastructure.

Based on: https://github.com/skillcreatorai/Ai-Agent-Skills
Spec: https://agentskills.io/specification
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .errors import ValidationError as SkillValidationError
from .parser import read_properties
from .prompt import to_prompt
from .validator import validate


@dataclass
class SkillMetadata:
    """Metadata for a skill from the registry"""
    name: str
    description: str
    category: str
    author: str
    source: str
    license: str
    path: str
    stars: int = 0
    downloads: int = 0
    featured: bool = False
    verified: bool = False
    tags: List[str] = field(default_factory=list)


class SkillLibraryManager:
    """
    Manages a curated library of Agent Skills from the Ai-Agent-Skills repository.
    
    Features:
    - Clone and update the skills repository
    - List available skills by category
    - Install/copy skills to local skills_ref directory
    - Validate and generate prompts for installed skills
    - Track installed skills and versions
    """
    
    REPO_URL = "https://github.com/skillcreatorai/Ai-Agent-Skills.git"
    REPO_NAME = "Ai-Agent-Skills"
    
    def __init__(
        self, 
        cache_dir: Optional[Path] = None,
        skills_dir: Optional[Path] = None
    ):
        """
        Initialize the skill library manager.
        
        Args:
            cache_dir: Directory for cached repository (default: /tmp/Ai-Agent-Skills)
            skills_dir: Directory for installed skills (default: agent/skills_ref/installed)
        """
        self.cache_dir = cache_dir or Path("/tmp") / self.REPO_NAME
        self.skills_dir = skills_dir or Path(__file__).parent / "installed"
        self.skills_dir.mkdir(exist_ok=True)
        
        # Track installed skills
        self.manifest_path = self.skills_dir / "manifest.json"
        self.manifest = self._load_manifest()
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load manifest of installed skills"""
        if self.manifest_path.exists():
            return json.loads(self.manifest_path.read_text())
        return {"version": "1.0", "installed": []}
    
    def _save_manifest(self):
        """Save manifest of installed skills"""
        self.manifest_path.write_text(json.dumps(self.manifest, indent=2))
    
    def clone_or_update_repo(self, force: bool = False) -> Path:
        """
        Clone or update the Ai-Agent-Skills repository.
        
        Args:
            force: Force re-clone even if repo exists
        
        Returns:
            Path to the cloned repository
        """
        if force and self.cache_dir.exists():
            shutil.rmtree(self.cache_dir)
        
        if not self.cache_dir.exists():
            print(f"📦 Cloning {self.REPO_URL} to {self.cache_dir}...")
            subprocess.run(
                ["git", "clone", "--depth", "1", self.REPO_URL, str(self.cache_dir)],
                check=True,
                capture_output=True
            )
            print("✅ Repository cloned successfully")
        else:
            print(f"🔄 Updating {self.cache_dir}...")
            subprocess.run(
                ["git", "-C", str(self.cache_dir), "pull", "--depth", "1"],
                check=True,
                capture_output=True
            )
            print("✅ Repository updated")
        
        return self.cache_dir
    
    def list_available_skills(self, category: Optional[str] = None) -> List[SkillMetadata]:
        """
        List all available skills from the registry.
        
        Args:
            category: Filter by category (development, document, creative, business, productivity)
        
        Returns:
            List of skill metadata
        """
        # Ensure repo is cloned
        if not self.cache_dir.exists():
            self.clone_or_update_repo()
        
        # Load skills.json registry
        registry_path = self.cache_dir / "skills.json"
        if not registry_path.exists():
            raise FileNotFoundError(f"Registry not found: {registry_path}")
        
        registry = json.loads(registry_path.read_text())
        skills = []
        
        for skill_data in registry["skills"]:
            if category and skill_data.get("category") != category:
                continue
            
            skills.append(SkillMetadata(
                name=skill_data["name"],
                description=skill_data["description"],
                category=skill_data["category"],
                author=skill_data["author"],
                source=skill_data["source"],
                license=skill_data["license"],
                path=skill_data["path"],
                stars=skill_data.get("stars", 0),
                downloads=skill_data.get("downloads", 0),
                featured=skill_data.get("featured", False),
                verified=skill_data.get("verified", False),
                tags=skill_data.get("tags", [])
            ))
        
        return skills
    
    def get_skill_path(self, skill_name: str) -> Optional[Path]:
        """
        Get the path to a skill in the cached repository.
        
        Args:
            skill_name: Name of the skill (e.g., "theme-factory")
        
        Returns:
            Path to skill directory or None if not found
        """
        skill_path = self.cache_dir / "skills" / skill_name
        return skill_path if skill_path.exists() else None
    
    def install_skill(
        self, 
        skill_name: str, 
        validate_first: bool = True,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        Install a skill from the repository to the local skills directory.
        
        Args:
            skill_name: Name of the skill to install
            validate_first: Validate skill before installing
            overwrite: Overwrite if skill already exists
        
        Returns:
            Installation result with status and details
        """
        # Get skill path from cache
        source_path = self.get_skill_path(skill_name)
        if not source_path:
            return {
                "status": "error",
                "message": f"Skill '{skill_name}' not found in repository"
            }
        
        # Check if already installed
        dest_path = self.skills_dir / skill_name
        if dest_path.exists() and not overwrite:
            return {
                "status": "error",
                "message": f"Skill '{skill_name}' already installed (use overwrite=True)"
            }
        
        # Validate skill structure
        if validate_first:
            try:
                validate(source_path)
            except SkillValidationError as e:
                return {
                    "status": "error",
                    "message": f"Validation failed: {str(e)}"
                }
        
        # Copy skill to local directory
        if dest_path.exists():
            shutil.rmtree(dest_path)
        
        shutil.copytree(source_path, dest_path)
        
        # Update manifest
        skill_info = read_properties(dest_path)
        self.manifest["installed"].append({
            "name": skill_name,
            "installed_at": str(Path.cwd()),
            "properties": skill_info.to_dict()  # Convert to dict for JSON serialization
        })
        self._save_manifest()
        
        return {
            "status": "success",
            "message": f"Skill '{skill_name}' installed to {dest_path}",
            "path": str(dest_path)
        }
    
    def install_multiple(
        self, 
        skill_names: List[str],
        validate_first: bool = True
    ) -> Dict[str, Any]:
        """
        Install multiple skills at once.
        
        Args:
            skill_names: List of skill names to install
            validate_first: Validate each skill before installing
        
        Returns:
            Results for each skill
        """
        results = {}
        for skill_name in skill_names:
            results[skill_name] = self.install_skill(
                skill_name, 
                validate_first=validate_first
            )
        
        return results
    
    def uninstall_skill(self, skill_name: str) -> Dict[str, str]:
        """
        Uninstall a skill from the local directory.
        
        Args:
            skill_name: Name of the skill to uninstall
        
        Returns:
            Uninstallation result
        """
        dest_path = self.skills_dir / skill_name
        if not dest_path.exists():
            return {
                "status": "error",
                "message": f"Skill '{skill_name}' not installed"
            }
        
        shutil.rmtree(dest_path)
        
        # Update manifest
        self.manifest["installed"] = [
            s for s in self.manifest["installed"] 
            if s["name"] != skill_name
        ]
        self._save_manifest()
        
        return {
            "status": "success",
            "message": f"Skill '{skill_name}' uninstalled"
        }
    
    def list_installed_skills(self) -> List[Dict[str, Any]]:
        """List all installed skills"""
        return self.manifest.get("installed", [])
    
    def generate_installed_skills_prompt(self) -> str:
        """
        Generate <available_skills> prompt for all installed skills.
        
        Returns:
            XML prompt string for agent consumption
        """
        installed = self.list_installed_skills()
        if not installed:
            return "<!-- No skills installed -->"
        
        # Collect all valid skill paths
        skill_paths = []
        for skill_info in installed:
            skill_path = self.skills_dir / skill_info["name"]
            if skill_path.exists():
                skill_paths.append(skill_path)
        
        if not skill_paths:
            return "<!-- No valid skills found -->"
        
        # Use to_prompt with list of paths
        try:
            return to_prompt(skill_paths)
        except Exception as e:
            return f"<!-- Error generating prompt: {str(e)} -->"
    
    def search_skills(self, query: str) -> List[SkillMetadata]:
        """
        Search for skills by name or description.
        
        Args:
            query: Search query (case-insensitive)
        
        Returns:
            List of matching skills
        """
        all_skills = self.list_available_skills()
        query_lower = query.lower()
        
        return [
            skill for skill in all_skills
            if query_lower in skill.name.lower() 
            or query_lower in skill.description.lower()
            or any(query_lower in tag.lower() for tag in skill.tags)
        ]
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all skill categories with counts"""
        if not self.cache_dir.exists():
            self.clone_or_update_repo()
        
        registry_path = self.cache_dir / "skills.json"
        registry = json.loads(registry_path.read_text())
        return registry.get("categories", [])


# Convenience functions for CLI and agent integration

def install_recommended_skills() -> Dict[str, Any]:
    """
    Install a curated set of recommended skills for GenUI workbench.
    
    Recommended skills:
    - theme-factory: Styling artifacts
    - mcp-builder: MCP server creation
    - code-review: PR analysis
    - frontend-design: UI components
    - artifacts-builder: Interactive React components
    """
    manager = SkillLibraryManager()
    
    recommended = [
        "theme-factory",
        "mcp-builder",
        "code-review",
        "frontend-design",
        "artifacts-builder"
    ]
    
    return manager.install_multiple(recommended)


def generate_agent_prompt() -> str:
    """
    Generate agent prompt with all installed skills.
    
    Returns:
        XML prompt string for injection into agent system prompt
    """
    manager = SkillLibraryManager()
    return manager.generate_installed_skills_prompt()
