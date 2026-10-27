import { WorkbookModel } from '../model/workbook';

export interface Command {
  readonly description: string;
  execute(wb: WorkbookModel): void;
  undo(wb: WorkbookModel): void;
}

export class CommandBus {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: Set<() => void> = new Set();

  constructor(private wb: WorkbookModel) {}

  execute(cmd: Command): void {
    cmd.execute(this.wb);
    this.undoStack.push(cmd);
    this.redoStack = []; // clear redo on new action
    this.notify();
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo(this.wb);
    this.redoStack.push(cmd);
    this.notify();
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.execute(this.wb);
    this.undoStack.push(cmd);
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
