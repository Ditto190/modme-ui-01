#!/bin/bash
# Quick test of the Skill Library integration

set -e

echo "🧪 Testing Skill Library Integration"
echo "======================================"

cd /workspaces/modme-ui-01

# Test 1: Update repository
echo ""
echo "📦 Test 1: Update repository cache"
python -m agent.skills_ref.skill_library_cli update-repo

# Test 2: List categories
echo ""
echo "📂 Test 2: List categories"
python -m agent.skills_ref.skill_library_cli categories

# Test 3: List all skills
echo ""
echo "📚 Test 3: List all available skills"
python -m agent.skills_ref.skill_library_cli list | head -20

# Test 4: Search skills
echo ""
echo "🔍 Test 4: Search for 'theme' skills"
python -m agent.skills_ref.skill_library_cli search theme

# Test 5: Install a skill
echo ""
echo "📦 Test 5: Install theme-factory skill"
python -m agent.skills_ref.skill_library_cli install theme-factory --overwrite

# Test 6: List installed
echo ""
echo "✅ Test 6: List installed skills"
python -m agent.skills_ref.skill_library_cli installed

# Test 7: Generate prompt
echo ""
echo "📝 Test 7: Generate agent prompt"
python -m agent.skills_ref.skill_library_cli generate-prompt | head -50

# Test 8: Python API
echo ""
echo "🐍 Test 8: Python API usage"
python << 'EOF'
from agent.skills_ref import SkillLibraryManager

manager = SkillLibraryManager()

# List development skills
dev_skills = manager.list_available_skills(category="development")
print(f"\n✓ Found {len(dev_skills)} development skills")

# Search
results = manager.search_skills("mcp")
print(f"✓ Found {len(results)} skills matching 'mcp'")

# Check installed
installed = manager.list_installed_skills()
print(f"✓ {len(installed)} skills currently installed")

print("\n✅ Python API test passed")
EOF

echo ""
echo "======================================"
echo "✅ All tests passed!"
echo ""
echo "📚 Skill Library is ready to use"
echo "Run 'python -m agent.skills_ref.skill_library_cli --help' for more commands"
