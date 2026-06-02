/**
 * Type shims for OPTIONAL runtime dependencies that we dynamically import
 * only when a corresponding env var (e.g. SENTRY_DSN) is set. Declaring
 * the module here lets TypeScript resolve the import without requiring
 * the package to be installed at build time.
 *
 * If you `npm install @sentry/node` for real, you can delete the matching
 * declaration here.
 */
declare module '@sentry/node' {
  export function wrapMcpServerWithSentry<T>(server: T): T;
}
