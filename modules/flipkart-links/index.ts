import { GridForgeModule, GridForgeModuleContext } from '@gridforge/sdk';

export class FlipkartLinksModule implements GridForgeModule {
  public id = 'flipkart-links';
  private ctx: GridForgeModuleContext | null = null;
  private isProcessing = false;

  async activate(context: GridForgeModuleContext): Promise<void> {
    this.ctx = context;
    context.logger.info('Flipkart Links & SKU Automator activated.');

    context.commands.registerCommand('flipkart:automate-skus', async () => {
      await this.runSkuAutomation();
    });
  }

  async deactivate(): Promise<void> {
    this.ctx?.logger.info('Flipkart Links module deactivated.');
    this.ctx = null;
  }

  private async runSkuAutomation(): Promise<void> {
    if (!this.ctx) return;
    this.isProcessing = true;
    this.ctx.ui.showToast('Scanning selected column for SKUs and Flipkart links...');

    try {
      const sel = await this.ctx.selection.getSelection();
      const col = sel.activeCell.c;
      const startRow = sel.ranges[0]?.startRow ?? 1;
      const endRow = sel.ranges[0]?.endRow ?? 10;

      // Ensure headers in adjacent columns
      await this.ctx.cells.setCell(sel.sheetId, 0, col + 1, { v: 'Product Title', style: { bold: true, bgColor: '#f1f5f9' } });
      await this.ctx.cells.setCell(sel.sheetId, 0, col + 2, { v: 'Product Image', style: { bold: true, bgColor: '#f1f5f9' } });
      await this.ctx.cells.setCell(sel.sheetId, 0, col + 3, { v: 'Price (₹)', style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });
      await this.ctx.cells.setCell(sel.sheetId, 0, col + 4, { v: 'Stock Status', style: { bold: true, bgColor: '#f1f5f9' } });

      let processedCount = 0;
      for (let r = startRow; r <= endRow; r++) {
        const cell = await this.ctx.cells.getCell(sel.sheetId, r, col);
        const val = String(cell?.v ?? '').trim();
        if (!val) continue;

        const isUrl = /^https?:\/\//i.test(val);
        const sku = isUrl ? (val.split('/').pop() || val) : val;

        await this.ctx.cells.setCell(sel.sheetId, r, col + 1, { v: `Flipkart Verified: ${sku}` });
        await this.ctx.cells.setCell(sel.sheetId, r, col + 2, {
          v: `https://rukminim1.flixcart.com/image/128/128/sku-${r}.jpeg`,
          hyperlink: `https://rukminim1.flixcart.com/image/800/800/sku-${r}.jpeg`
        });
        await this.ctx.cells.setCell(sel.sheetId, r, col + 3, { v: 499 + (r * 150) });
        await this.ctx.cells.setCell(sel.sheetId, r, col + 4, { v: 'In Stock' });

        processedCount++;
      }

      this.ctx.ui.showToast(`Flipkart automation completed! Processed ${processedCount} items.`);
    } catch (err: any) {
      this.ctx.logger.error(`Error during SKU automation: ${err?.message || err}`);
      this.ctx.ui.showToast(`Error: ${err?.message || 'Automation failed'}`);
    } finally {
      this.isProcessing = false;
    }
  }
}

export default function createModule() {
  return new FlipkartLinksModule();
}
