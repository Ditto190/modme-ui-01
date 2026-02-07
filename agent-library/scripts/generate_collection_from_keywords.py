#!/usr/bin/env python3
"""
Dynamic Collection Generator - Create agent collections based on keyword searches

Usage:
    python generate_collection_from_keywords.py "testing automation" --output my-collection
    python generate_collection_from_keywords.py "react nextjs frontend" --max-items 20
    python generate_collection_from_keywords.py "azure cloud devops" --include-agents --include-prompts --include-instructions
"""

import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


class CollectionGenerator:
    """Generate agent collections dynamically based on keyword searches"""

    def __init__(self, agent_library_root: Path):
        self.root = agent_library_root
        self.agents_dir = agent_library_root / "agents"
        self.prompts_dir = agent_library_root / "prompts"
        self.instructions_dir = agent_library_root / "instructions"
        self.collections_dir = agent_library_root / "collections"
        self.skills_dir = agent_library_root / "skills"

    def search_in_file(self, file_path: Path, keywords: List[str]) -> Dict[str, Any]:
        """
        Search for keywords in a file and return match information.

        Returns dict with:
        - matches: number of keyword matches
        - matched_keywords: list of matched keywords
        - frontmatter: parsed YAML frontmatter
        - relevance_score: calculated relevance score
        """
        try:
            content = file_path.read_text(encoding='utf-8')

            # Extract frontmatter
            frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
            frontmatter = {}

            if frontmatter_match:
                try:
                    frontmatter = yaml.safe_load(frontmatter_match.group(1))
                except yaml.YAMLError:
                    pass

            # Search for keywords (case-insensitive)
            content_lower = content.lower()
            matched_keywords = []
            match_count = 0

            for keyword in keywords:
                keyword_lower = keyword.lower()
                count = content_lower.count(keyword_lower)
                if count > 0:
                    matched_keywords.append(keyword)
                    match_count += count

            # Calculate relevance score
            # Title/description matches are worth more
            title_match = 0
            desc_match = 0

            if frontmatter:
                title = str(frontmatter.get('title', '')).lower()
                description = str(frontmatter.get('description', '')).lower()

                for keyword in keywords:
                    keyword_lower = keyword.lower()
                    if keyword_lower in title:
                        title_match += 10
                    if keyword_lower in description:
                        desc_match += 5

            relevance_score = match_count + title_match + desc_match

            return {
                'path': str(file_path.relative_to(self.root)),
                'matches': match_count,
                'matched_keywords': matched_keywords,
                'frontmatter': frontmatter,
                'relevance_score': relevance_score,
                'has_match': len(matched_keywords) > 0
            }

        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return {'has_match': False, 'relevance_score': 0}

    def search_directory(self, directory: Path, pattern: str, keywords: List[str]) -> List[Dict[str, Any]]:
        """Search all files in directory matching pattern"""
        results = []

        if not directory.exists():
            return results

        for file_path in directory.rglob(pattern):
            if file_path.is_file():
                match_info = self.search_in_file(file_path, keywords)
                if match_info['has_match']:
                    results.append(match_info)

        # Sort by relevance score (highest first)
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results

    def generate_collection_id(self, keywords: List[str]) -> str:
        """Generate collection ID from keywords"""
        # Use keywords to create kebab-case ID
        clean_keywords = [re.sub(r'[^a-zA-Z0-9]+', '', k) for k in keywords]
        return '-'.join(clean_keywords[:3]).lower()

    def generate_collection_name(self, keywords: List[str]) -> str:
        """Generate human-readable collection name"""
        return ' '.join([k.title() for k in keywords])

    def generate_tags(self, keywords: List[str], matched_items: List[Dict[str, Any]]) -> List[str]:
        """Generate tags from keywords and matched item metadata"""
        tags = set(keywords)

        # Extract tags from matched items
        for item in matched_items[:10]:  # Top 10 items
            if 'frontmatter' in item and item['frontmatter']:
                fm_tags = item['frontmatter'].get('tags', [])
                if isinstance(fm_tags, list):
                    tags.update(fm_tags)

        return sorted(list(tags))[:10]  # Limit to 10 tags

    def generate_collection(
        self,
        keywords: List[str],
        max_items: int = 15,
        include_agents: bool = True,
        include_prompts: bool = True,
        include_instructions: bool = True,
        include_skills: bool = False,
        output_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a collection based on keyword search.

        Args:
            keywords: List of search keywords
            max_items: Maximum items to include
            include_agents: Include agent files
            include_prompts: Include prompt files
            include_instructions: Include instruction files
            include_skills: Include skill files
            output_name: Custom collection ID (optional)

        Returns:
            Dict with collection metadata and items
        """
        print(f"🔍 Searching for: {', '.join(keywords)}")
        print(f"📁 Agent library root: {self.root}\n")

        all_matches = []

        # Search agents
        if include_agents:
            print("Searching agents...")
            agent_matches = self.search_directory(self.agents_dir, "*.agent.md", keywords)
            for match in agent_matches:
                match['kind'] = 'agent'
            all_matches.extend(agent_matches)
            print(f"  Found {len(agent_matches)} matching agents")

        # Search prompts
        if include_prompts:
            print("Searching prompts...")
            prompt_matches = self.search_directory(self.prompts_dir, "*.prompt.md", keywords)
            for match in prompt_matches:
                match['kind'] = 'prompt'
            all_matches.extend(prompt_matches)
            print(f"  Found {len(prompt_matches)} matching prompts")

        # Search instructions
        if include_instructions:
            print("Searching instructions...")
            instruction_matches = self.search_directory(self.instructions_dir, "*.instructions.md", keywords)
            for match in instruction_matches:
                match['kind'] = 'instruction'
            all_matches.extend(instruction_matches)
            print(f"  Found {len(instruction_matches)} matching instructions")

        # Search skills
        if include_skills:
            print("Searching skills...")
            skill_matches = self.search_directory(self.skills_dir, "SKILL.md", keywords)
            for match in skill_matches:
                match['kind'] = 'skill'
            all_matches.extend(skill_matches)
            print(f"  Found {len(skill_matches)} matching skills")

        # Sort all matches by relevance
        all_matches.sort(key=lambda x: x['relevance_score'], reverse=True)

        # Limit to max_items
        selected_items = all_matches[:max_items]

        print(f"\n📊 Total matches: {len(all_matches)}")
        print(f"✅ Selected top {len(selected_items)} items\n")

        # Generate collection metadata
        collection_id = output_name or self.generate_collection_id(keywords)
        collection_name = self.generate_collection_name(keywords)
        tags = self.generate_tags(keywords, selected_items)

        # Build collection structure
        collection_items = [
            {'path': item['path'], 'kind': item['kind']}
            for item in selected_items
        ]

        collection_data = {
            'id': collection_id,
            'name': collection_name,
            'description': f"Collection focused on {', '.join(keywords)}. Auto-generated based on keyword search.",
            'tags': tags,
            'items': collection_items,
            'display': {
                'ordering': 'manual',
                'show_badge': True,
                'featured': False
            },
            # Additional metadata fields (not part of official spec, but useful for tracking)
            'generation': {
                'generated_at': datetime.now().isoformat(),
                'keywords': keywords,
                'total_matches': len(all_matches),
                'selected_items': len(selected_items)
            }
        }

        return collection_data

    def save_collection(self, collection_data: Dict[str, Any], output_dir: Optional[Path] = None):
        """Save collection as YAML and Markdown files"""
        output_dir = output_dir or self.collections_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        collection_id = collection_data['id']

        # Save YAML file (includes generation metadata as additional fields)
        yaml_path = output_dir / f"{collection_id}.collection.yml"
        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(collection_data, f, default_flow_style=False, allow_unicode=True)

        print(f"✅ Saved YAML: {yaml_path}")

        # Generate and save Markdown file
        md_path = output_dir / f"{collection_id}.md"
        md_content = self.generate_markdown(collection_data)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)

        print(f"✅ Saved Markdown: {md_path}")

    def generate_markdown(self, collection_data: Dict[str, Any]) -> str:
        """Generate Markdown documentation for the collection"""
        name = collection_data['name']
        description = collection_data['description']
        tags = collection_data['tags']
        items = collection_data['items']
        generation = collection_data.get('generation', {})

        md = f"# {name}\n\n"
        md += f"{description}\n\n"

        if tags:
            md += f"**Tags**: {', '.join(tags)}\n\n"

        if generation:
            md += "## Collection Details\n\n"
            md += f"- **Generated**: {generation.get('generated_at', 'N/A')}\n"
            md += f"- **Keywords**: {', '.join(generation.get('keywords', []))}\n"
            md += f"- **Total Matches**: {generation.get('total_matches', 0)}\n"
            md += f"- **Selected Items**: {generation.get('selected_items', 0)}\n\n"

        # Group items by kind
        agents = [item for item in items if item['kind'] == 'agent']
        prompts = [item for item in items if item['kind'] == 'prompt']
        instructions = [item for item in items if item['kind'] == 'instruction']
        skills = [item for item in items if item['kind'] == 'skill']

        md += "## Items in this Collection\n\n"

        if agents:
            md += "### Agents\n\n"
            for item in agents:
                filename = Path(item['path']).name
                md += f"- [{filename}]({item['path']})\n"
            md += "\n"

        if prompts:
            md += "### Prompts\n\n"
            for item in prompts:
                filename = Path(item['path']).name
                md += f"- [{filename}]({item['path']})\n"
            md += "\n"

        if instructions:
            md += "### Instructions\n\n"
            for item in instructions:
                filename = Path(item['path']).name
                md += f"- [{filename}]({item['path']})\n"
            md += "\n"

        if skills:
            md += "### Skills\n\n"
            for item in skills:
                skill_dir = Path(item['path']).parent.name
                md += f"- [{skill_dir}]({item['path']})\n"
            md += "\n"

        md += "## Usage\n\n"
        md += "This collection can be used in GitHub Copilot Chat:\n\n"
        md += "1. Install the collection files\n"
        md += "2. Access items via `/` commands (for prompts)\n"
        md += "3. Activate agents in VS Code Copilot Chat\n"
        md += "4. Instructions apply automatically based on file patterns\n\n"

        return md


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Generate agent collections based on keyword searches',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "testing automation"
  %(prog)s "react nextjs frontend" --max-items 20
  %(prog)s "azure cloud devops" --output azure-devops-collection
  %(prog)s "security vulnerability" --include-agents --include-prompts
        """
    )

    parser.add_argument('keywords', help='Space-separated keywords to search for')
    parser.add_argument('--max-items', type=int, default=15,
                       help='Maximum items to include (default: 15)')
    parser.add_argument('--output', help='Custom collection ID (default: auto-generated)')
    parser.add_argument('--include-agents', action='store_true', default=True,
                       help='Include agent files (default: True)')
    parser.add_argument('--include-prompts', action='store_true', default=True,
                       help='Include prompt files (default: True)')
    parser.add_argument('--include-instructions', action='store_true', default=True,
                       help='Include instruction files (default: True)')
    parser.add_argument('--include-skills', action='store_true', default=False,
                       help='Include skill files (default: False)')
    parser.add_argument('--agent-library-root',
                       help='Path to agent-library directory (default: auto-detect)')

    args = parser.parse_args()

    # Parse keywords
    keywords = args.keywords.split()

    # Detect agent-library root
    if args.agent_library_root:
        agent_library_root = Path(args.agent_library_root)
    else:
        # Try to find agent-library directory
        current = Path.cwd()
        agent_library_root = None

        # Check current directory and parents
        for parent in [current] + list(current.parents):
            potential = parent / 'agent-library'
            if potential.exists() and (potential / 'agents').exists():
                agent_library_root = potential
                break

        if not agent_library_root:
            print("❌ Error: Could not find agent-library directory")
            print("   Use --agent-library-root to specify the path")
            sys.exit(1)

    # Generate collection
    generator = CollectionGenerator(agent_library_root)

    collection_data = generator.generate_collection(
        keywords=keywords,
        max_items=args.max_items,
        include_agents=args.include_agents,
        include_prompts=args.include_prompts,
        include_instructions=args.include_instructions,
        include_skills=args.include_skills,
        output_name=args.output
    )

    # Save collection
    generator.save_collection(collection_data)

    print("\n✨ Collection generated successfully!")
    print(f"\n📄 Collection ID: {collection_data['id']}")
    print(f"📝 Name: {collection_data['name']}")
    print(f"🏷️  Tags: {', '.join(collection_data['tags'])}")


if __name__ == '__main__':
    main()
