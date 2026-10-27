import { ASTNode, CellCoord, RangeCoord } from './types';

export class DependencyExtractor {
  static extract(ast: ASTNode): { cells: CellCoord[]; ranges: RangeCoord[] } {
    const cells: CellCoord[] = [];
    const ranges: RangeCoord[] = [];

    function traverse(node: ASTNode) {
      if (!node) return;
      if (node.type === 'reference') {
        cells.push(node.coord);
      } else if (node.type === 'range') {
        ranges.push(node.range);
      } else if (node.type === 'binary') {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === 'unary') {
        traverse(node.operand);
      } else if (node.type === 'function') {
        node.args.forEach(traverse);
      }
    }

    traverse(ast);
    return { cells, ranges };
  }
}

export class DependencyGraph {
  // node -> dependent nodes
  private dependents: Map<string, Set<string>> = new Map();
  // node -> dependency nodes
  private dependencies: Map<string, Set<string>> = new Map();

  key(sheet = 'default', r: number, c: number): string {
    return `${sheet}!${r},${c}`;
  }

  setFormulaDeps(sheet = 'default', r: number, c: number, cells: CellCoord[], ranges: RangeCoord[]): void {
    const targetKey = this.key(sheet, r, c);

    // Clear old dependencies
    const oldDeps = this.dependencies.get(targetKey);
    if (oldDeps) {
      for (const d of oldDeps) {
        this.dependents.get(d)?.delete(targetKey);
      }
    }

    const newDeps = new Set<string>();
    for (const cell of cells) {
      newDeps.add(this.key(cell.sheet || sheet, cell.r, cell.c));
    }
    for (const rg of ranges) {
      for (let cr = rg.r0; cr <= rg.r1; cr++) {
        for (let cc = rg.c0; cc <= rg.c1; cc++) {
          newDeps.add(this.key(rg.sheet || sheet, cr, cc));
        }
      }
    }

    this.dependencies.set(targetKey, newDeps);
    for (const d of newDeps) {
      if (!this.dependents.has(d)) this.dependents.set(d, new Set());
      this.dependents.get(d)!.add(targetKey);
    }
  }

  hasCycle(startKey: string): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const check = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      const nexts = this.dependencies.get(node);
      if (nexts) {
        for (const n of nexts) {
          if (!visited.has(n) && check(n)) return true;
          else if (recStack.has(n)) return true;
        }
      }
      recStack.delete(node);
      return false;
    };

    return check(startKey);
  }

  getAffectedOrder(startKey: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    const dfs = (node: string) => {
      visited.add(node);
      const deps = this.dependents.get(node);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) dfs(dep);
        }
      }
      order.push(node);
    };

    dfs(startKey);
    return order.reverse();
  }
}
