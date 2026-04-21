```markdown
# axiom-search Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute to the `axiom-search` codebase, a TypeScript project built with the Next.js framework. You'll learn the project's coding conventions, commit message patterns, and testing structure, ensuring your contributions align with established standards.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `searchResults.ts`, `userProfile.tsx`

### Import Style
- Use **absolute imports** for modules.
  - Example:
    ```typescript
    import { fetchResults } from 'utils/api';
    ```

### Export Style
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // utils/search.ts
    export function searchAxiom(query: string) { ... }
    ```

### Commit Messages
- Follow the **conventional commit** format.
- Use the `feat` prefix for new features.
- Keep commit messages concise (average ~61 characters).
  - Example:
    ```
    feat: add advanced filtering to search results
    ```

## Workflows

_No automated or CI workflows detected in this repository._

## Testing Patterns

- Test files use the `*.test.*` naming pattern.
  - Example: `searchResults.test.ts`
- The specific testing framework is **unknown** (not detected).
- Place test files alongside the modules they test or in a dedicated `__tests__` directory.

#### Example Test File
```typescript
// searchResults.test.ts
import { searchAxiom } from 'utils/search';

describe('searchAxiom', () => {
  it('returns results for a valid query', () => {
    const results = searchAxiom('example');
    expect(results).toBeDefined();
  });
});
```

## Commands
| Command | Purpose |
|---------|---------|
| /contribute | Review coding conventions and commit patterns |
| /test | Run all test files matching `*.test.*` |
| /format | Ensure file naming, import, and export conventions are followed |
```
