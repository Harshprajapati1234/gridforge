import { GridForgeModule, GridForgeModuleContext, HealthCheckResult } from '@gridforge/sdk';

const HelloWorldModule: GridForgeModule = {
  activate(ctx: GridForgeModuleContext) {
    ctx.logger.info('Hello World activating...');
    ctx.commands.registerCommand('hello:greet', async (name = 'User') => {
      ctx.ui.showToast(`Hello, ${name}! Welcome to GridForge.`, 'success');
      return `Greeted ${name}`;
    });
  },
  deactivate() {},
  selfTest(): HealthCheckResult {
    return { ok: true, message: 'Hello World module is healthy and verified.' };
  }
};

export default HelloWorldModule;
