import "dotenv/config";
import { codebaseReviewWorkflow } from "../src/workflows/reviewPipeline";

async function main() {
  console.log("Running Code Review Workflow against 'dev' branch...");
  const result = await codebaseReviewWorkflow.run({
    baseBranch: "dev",
  });
  console.log("\n==================== WORKFLOW RESULT ====================");
  console.log("Full Result:", result);
  console.log("=========================================================");
}

main().catch(console.error);
