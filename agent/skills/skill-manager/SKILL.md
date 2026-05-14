---
name: Skill Manager
description: Meta-skill for installing, updating, and managing agent skills.
id: skill-manager
version: 1.0.0
license: MIT
---

# Skill Manager

A utility for managing the lifecycle of agent skills from a remote or local registry.

## Tools

### `install_skill`
Installs a skill from the registry.
- **skill_name**: Name of the skill to install.

### `list_available_skills`
Queries the registry for available skills.
- **category**: (Optional) Filter by category.

### `uninstall_skill`
Removes an installed skill.

## Usage
Useful for agents that need to dynamically expand their capabilities during a task.
