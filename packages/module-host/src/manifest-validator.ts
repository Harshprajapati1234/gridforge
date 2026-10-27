import { ModuleManifest, ModulePermission } from '@gridforge/sdk';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_PERMISSIONS: ModulePermission[] = [
  'cells.read',
  'cells.write',
  'selection.read',
  'events',
  'commands',
  'ui',
  'bridge',
  'settings',
  'storage',
  'clipboard',
  'network:local',
  'network:external',
  'network:none',
  'fs:dialog'
];

export function validateManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a JSON object.'] };
  }
  const m = manifest as Partial<ModuleManifest>;
  if (!m.id || typeof m.id !== 'string' || !/^[a-z0-9-_]+$/.test(m.id)) {
    errors.push('Module id is required and must only contain lowercase alphanumeric, hyphen, or underscore.');
  }
  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    errors.push('Module name is required.');
  }
  if (!m.version || typeof m.version !== 'string' || !/^\d+\.\d+\.\d+/.test(m.version)) {
    errors.push('Module version must follow semver.');
  }
  if (!m.apiVersion || typeof m.apiVersion !== 'string') {
    errors.push('Module apiVersion is required.');
  }
  if (!m.requires || typeof m.requires !== 'object' || !m.requires.core) {
    errors.push('requires.core is required.');
  }
  if (!Array.isArray(m.permissions)) {
    errors.push('Module permissions must be an array.');
  } else {
    for (const p of m.permissions) {
      if (!VALID_PERMISSIONS.includes(p as ModulePermission)) {
        errors.push(`Unknown permission: "${p}".`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
