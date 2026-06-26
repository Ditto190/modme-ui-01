import { execSync } from 'child_process';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isFull = args.includes('--full');

console.log('Running lean-ctx intake...', { dryRun: isDryRun, full: isFull });

if (!isDryRun) {
    try {
        execSync('npx lean-ctx knowledge export --format json --output knowledge-base.json', { stdio: 'inherit' });
        console.log('Knowledge base exported successfully.');
    } catch (error) {
        console.error('Error exporting knowledge base:', error);
        process.exit(1);
    }
} else {
    console.log('Dry run: Skipping export.');
}
