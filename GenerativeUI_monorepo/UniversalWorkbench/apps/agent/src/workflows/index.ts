import { inboxPipelineWorkflow } from './inboxPipeline.js';
import { statusReportWorkflow } from './statusReport.js';

export { inboxPipelineWorkflow, statusReportWorkflow };

export const workflows = {
  inboxPipeline: inboxPipelineWorkflow,
  statusReport: statusReportWorkflow,
};
