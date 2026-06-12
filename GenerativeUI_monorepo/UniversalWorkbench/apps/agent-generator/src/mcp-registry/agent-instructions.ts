import { Molecule, generateMoleculeInstructions } from './molecule-generator.js';

/**
 * Generate comprehensive agent instructions based on available molecules and context.
 */
export function generateAgentInstructions(
  molecules: Molecule[],
  context: { task: string; constraints: string[] }
): string {
  const { task, constraints } = context;

  // 1. Header
  let instructions = `# Agent Instructions\n\n`;
  instructions += `## Task\n${task}\n\n`;

  // 2. Global Constraints
  if (constraints.length > 0) {
    instructions += `## Global Constraints\n`;
    constraints.forEach(c => {
      instructions += `- ${c}\n`;
    });
    instructions += `\n`;
  }

  // 3. Available Tools (Molecules)
  instructions += `## Available Tools (Molecules)\n`;
  instructions += `You have access to the following high-level tools ("Molecules"). \n`;
  instructions += `Use these molecules to accomplish your task. Do NOT use raw MCP tools if a molecule wrapper exists.\n\n`;

  molecules.forEach(molecule => {
    instructions += `### ${molecule.name} (${molecule.id})\n`;
    instructions += `${molecule.description}\n`;
    instructions += `- **When to use**: ${molecule.semantics}\n`;
    instructions += `- **Safe to use**: ${molecule.genUItier}\n\n`; // Simplified view
  });

  // 4. Detailed Molecule References
  instructions += `## Tool Usage Reference\n`;
  instructions += `Below are the detailed schemas and instructions for each molecule.\n\n`;
  
  molecules.forEach(molecule => {
    instructions += generateMoleculeInstructions(molecule);
    instructions += `\n---\n\n`;
  });

  // 5. System Prompt / Persona
  instructions += `## Operational Guidelines\n`;
  instructions += `1. **Analyze the Request**: Understand the user's intent and select the appropriate molecule.\n`;
  instructions += `2. **Check Constraints**: Ensure your action complies with both global and molecule-specific constraints.\n`;
  instructions += `3. **Formulate Action**: Construct the usage JSON for the selected molecule.\n`;
  instructions += `4. **Execute**: Submit the molecule action.\n`;

  return instructions;
}
