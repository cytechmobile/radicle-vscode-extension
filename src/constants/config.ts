/**
 * PRECONDITION:
 *
 * Each command has a matching entry defined in package.json's `contributes.commands`.
 */
export const radCliCmdsToRegisterInVsCode = [
  'push',
  'pull',
  'sync',
] as const;
