# Code Architecture Documentation

## Overview

The TSV TWL Creation App has been refactored from a monolithic 1,400+ line single file into a modular, maintainable architecture. This document outlines the new structure and design decisions.

## File Structure

```
src/
├── App.jsx                 # Main application component (298 lines)
├── components/
│   └── TWLTable.jsx        # Interactive table component
├── hooks/
│   ├── useAppState.js      # Application state management
│   └── useTableData.js     # Table data and interactions
├── services/
│   ├── apiService.js       # External API calls
│   └── twlService.js       # TWL processing and merging
├── utils/
│   ├── storage.js          # localStorage/cookie utilities
│   ├── urlConverters.js    # URL conversion functions
│   ├── tsvUtils.js         # TSV processing utilities
│   └── disambiguationUtils.js # Disambiguation parsing
└── common/
    └── books.js            # Bible book data
```

## Architecture Principles

### 1. Separation of Concerns

- **Components**: UI rendering and user interactions
- **Hooks**: State management and business logic
- **Services**: External API calls and complex processing
- **Utils**: Pure functions and utilities

### 2. Single Responsibility

Each file has a clear, focused purpose:

- `TWLTable.jsx`: Only handles table rendering and interactions
- `apiService.js`: Only handles external API calls
- `storage.js`: Only handles data persistence

### 3. Dependency Injection

Components receive data and handlers via props, making them testable and reusable.

### 4. Custom Hooks

Complex state logic is extracted into custom hooks:

- `useAppState`: Manages all application-level state
- `useTableData`: Manages table-specific state and interactions

## Key Improvements

### Maintainability ⭐⭐⭐⭐⭐ (5/5)

- **Before**: 1,408 lines in one file - nearly impossible to maintain
- **After**: Largest file is 298 lines, focused components

### Testability ⭐⭐⭐⭐⭐ (5/5)

- **Before**: No way to test individual functions or components
- **After**: Each utility, service, and hook can be unit tested

### Reusability ⭐⭐⭐⭐⭐ (5/5)

- **Before**: Everything tightly coupled in one component
- **After**: Components and utilities can be reused across projects

### Debugging ⭐⭐⭐⭐⭐ (5/5)

- **Before**: Hard to locate specific functionality
- **After**: Clear file structure makes finding code intuitive

### Documentation ⭐⭐⭐⭐⭐ (5/5)

- **Before**: Minimal comments, unclear purpose
- **After**: Comprehensive JSDoc comments and clear file purposes

## Component Details

### App.jsx (Main Component)

- **Purpose**: Application shell and high-level orchestration
- **Size**: 298 lines (vs 1,408 previously)
- **Responsibilities**: Layout, main event handlers, data flow coordination

### TWLTable.jsx (Table Component)

- **Purpose**: Interactive table rendering with edit capabilities
- **Features**: Row deletion, disambiguation clicking, reference links
- **Props-based**: Receives data and handlers, no internal state

### Custom Hooks

#### useAppState.js

- **Purpose**: Centralized application state management
- **Features**: Persistence, book/branch selection, content loading
- **Benefits**: Reusable across components, testable in isolation

#### useTableData.js

- **Purpose**: Table-specific state and interactions
- **Features**: Row deletion with undo, disambiguation handling
- **Benefits**: Separates table logic from main app logic

### Services

#### apiService.js

- **Purpose**: External API communication
- **Features**: Branch fetching, USFM/TWL content retrieval
- **Benefits**: Centralized error handling, easy to mock for tests

#### twlService.js

- **Purpose**: Complex TWL processing and merging
- **Features**: Pointer-based merging algorithm
- **Benefits**: Isolated complex logic, easier to debug and test

**Merge Strategies:**

The `twlService.js` module implements **two different merge algorithms** that can be selected based on user preference:

1. **`mergeExistingTwls()` - Fetched-First Approach (Default)**
   - **When to use**: When updating a recently generated TWL or preserving existing sort order
   - **How it works**: Uses fetched/existing TWLs as the foundation, maintaining their original order
   - **New content**: Newly generated TWLs are inserted before or after matched existing entries
   - **Result**: Preserves the structure of previously created lists
   - **Merge Status**: Existing rows marked as "MERGED" (matched) or "OLD" (unmatched); generated rows marked as "NEW"

2. **`mergeExistingTwlsGeneratedFirst()` - Generated-First Approach**
   - **When to use**: When generating TWLs for a book that has **never had automated TWLs generated** before
   - **How it works**: Uses generated TWLs as the foundation, maintaining their generation order
   - **Existing content**: Fetched TWLs that don't match are inserted based on their Bible reference position
   - **Result**: Creates a new sort order based on the generation algorithm
   - **Merge Status**: Generated rows marked as "MERGED" (matched) or "NEW" (unmatched); fetched rows marked as "OLD"

**Implementation Details:**

- Both algorithms handle **disambiguation merging**: When a fetched and generated row match but have different TWLinks, the app intelligently merges the disambiguation options
- **ID and TWLink preservation**: Depending on the algorithm, either fetched or generated data is used for key fields
- **Reference-based insertion**: Uses `compareReferences()` from `tsvUtils.js` to determine insertion positions based on Bible book and chapter:verse ordering

- **Benefits**: Isolated complex logic, easier to debug and test

### Utilities

#### tsvUtils.js

- **Purpose**: TSV parsing and processing functions
- **Features**: Validation, parsing, reference comparison
- **Benefits**: Pure functions, highly testable

#### storage.js

- **Purpose**: Data persistence with fallbacks
- **Features**: localStorage with cookie fallback
- **Benefits**: Centralized storage strategy

## Development Workflow

### Adding New Features

1. Identify the appropriate layer (component, hook, service, util)
2. Create focused, single-purpose functions
3. Add comprehensive JSDoc comments
4. Consider testability in the design

### Debugging Issues

1. Check the file structure to locate relevant code
2. Use browser dev tools to trace data flow
3. Individual utilities can be tested in isolation

### Making Changes

1. Changes to utilities are safe - they're pure functions
2. Changes to services affect all consumers - test carefully
3. Changes to hooks affect all components using them
4. Changes to components only affect their specific UI

## Migration Benefits

### For Human Developers

- **Easy navigation**: Clear file structure and naming
- **Focused debugging**: Issues are isolated to specific files
- **Incremental changes**: Can modify one part without affecting others
- **Testing**: Each piece can be unit tested independently

### For AI Assistance

- **Context clarity**: Each file has a clear, documented purpose
- **Focused edits**: Changes can target specific functionality
- **Reduced complexity**: No more parsing 1,400+ line files
- **Pattern recognition**: Standard React/JavaScript patterns used throughout

## Future Improvements

### Potential Enhancements

1. **Type Safety**: Add TypeScript for better development experience
2. **Testing Suite**: Add Jest/React Testing Library tests
3. **State Management**: Consider Redux Toolkit for complex state
4. **Component Library**: Extract reusable components to separate package

### Performance Optimizations

1. **Code Splitting**: Lazy load components for better initial load
2. **Memoization**: Add React.memo to prevent unnecessary re-renders
3. **Virtual Scrolling**: For large TWL tables

## Conclusion

This refactor transforms an unmaintainable monolithic component into a clean, modular architecture that follows React and JavaScript best practices. The code is now:

- **Maintainable**: Easy to understand, modify, and extend
- **Testable**: Each piece can be tested in isolation
- **Scalable**: New features can be added without affecting existing code
- **Debuggable**: Issues can be quickly located and fixed
- **Documented**: Clear purpose and usage for each module

The architecture supports both human developers and AI-assisted development, making future enhancements much more manageable.
