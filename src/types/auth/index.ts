/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/types/auth/index.ts
 * Description: Barrel export for all authentication types, DTOs, error taxonomies,
 *              context interfaces, Zod schemas, and API contract definitions.
 */

// Re-export core session and context types
export * from './session.types';

// Re-export error taxonomies and response models
export * from './errors';

// Re-export version-friendly DTOs
export * from './dtos';

// Re-export Zod schemas & inferred validation types
export * from '../../lib/validations/auth.schemas';

// Re-export API contract map and endpoint constants
export * from './contracts';
