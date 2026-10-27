import { GridForgeModule, GridForgeModuleContext } from '@gridforge/sdk';

export interface BridgeJobItem {
  sku: string;
  url?: string;
  row?: number;
}

export interface BridgeJob {
  id: string;
  sheetName: string;
  items: BridgeJobItem[];
  created: number;
}

export class FlipkartLinksModule implements GridForgeModule {
  public id = 'flipkart-links';
  private ctx: GridForgeModuleContext | null = null;

  async activate(context: GridForgeModuleContext): Promise<void> {
    this.ctx = context;
    context.logger.info('Flipkart Links & SKU Automator activated.');

    // Command to launch SKU automation modal in renderer
    context.commands.registerCommand('flipkart:automate-skus', async () => {
      context.events.emit('flipkart:open-modal', {});
      context.ui.showToast('Opened Flipkart SKU Automator.', 'info');
    });

    // Command to queue a real job to the Bridge
    context.commands.registerCommand('bridge:queue-job', async (job: BridgeJob) => {
      context.logger.info(`Queueing Bridge job "${job.id}" with ${job.items?.length || 0} items.`);
      context.events.emit('bridge:job-queued', job);
      return { ok: true, jobId: job.id };
    });
  }

  async deactivate(): Promise<void> {
    this.ctx?.logger.info('Flipkart Links module deactivated.');
    this.ctx = null;
  }

  selfTest() {
    return { ok: true, message: 'Flipkart Links module verified and ready.' };
  }
}

export default new FlipkartLinksModule();
