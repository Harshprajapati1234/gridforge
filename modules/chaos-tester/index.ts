import { GridForgeModule, GridForgeModuleContext } from '@gridforge/sdk';

const ChaosTesterModule: GridForgeModule = {
  activate(ctx: GridForgeModuleContext) {
    ctx.logger.info('Chaos Tester ready.');
    ctx.commands.registerCommand('chaos:throw-error', () => {
      throw new Error('Simulated intentional runtime crash.');
    });
  },
  selfTest() {
    return { ok: true, message: 'Chaos Tester diagnostic checks ready.' };
  }
};

export default ChaosTesterModule;
