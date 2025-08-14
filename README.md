# TSV TWL Creation App

A React web application for creating and managing Translation Word Lists (TWL) from USFM content. This app supports merging with existing TWL data and provides an interactive table interface for editing and managing TWL entries.

## What it does

This app helps translators and editors create Translation Word Lists by:

1. **Loading USFM content** from various sources (paste, upload, or fetch from DCS)
2. **Generating TWL entries** automatically from USFM using the `twl-linker` library
3. **Merging with existing TWL files** to preserve manual edits and additions
4. **Interactive table editing** with row deletion, undo, and disambiguation options
5. **Exporting processed TWL files** in standard TSV format

## Features

### Input Options

- **Paste USFM text** directly from clipboard
- **Upload USFM files** from your computer
- **Fetch from DCS** - automatically downloads USFM files from Door43 repositories
- **Load existing TWL files** for merging with newly generated content

### TWL Generation

- **Automatic TWL creation** from USFM using external libraries
- **GLQuote and GLOccurrence columns** added automatically
- **Quote conversion** from Gateway Language to Original Language
- **Smart merging** with existing TWL content using pointer-based algorithms

### Interactive Table Features

- **Row deletion** with single-level undo functionality
- **Clickable disambiguation options** to switch between alternative word links
- **Reference links** that open Translation Notes in new windows
- **Context truncation** with hover tooltips for long text
- **Column visibility** controls (show/hide extra columns)

### Export Options

- **Raw TSV editing** mode for direct text manipulation
- **Table view** with interactive features
- **Download processed files** in standard TSV format
- **Persistent settings** for book and branch selections

## Development

### Prerequisites

- Node.js (v16 or higher)
- pnpm package manager

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/unfoldingWord/tsv7-twl-creation-app.git
   cd tsv7-twl-creation-app
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173/`

### Development Commands

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Create production build
- `pnpm run preview` - Preview production build locally
- `pnpm run lint` - Run ESLint for code quality checks

### Architecture

This application has been refactored into a modular, maintainable architecture. For detailed information about the codebase structure, design decisions, and development guidelines, see:

**📖 [ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation

Key architectural highlights:

- **Modular structure** with separated concerns
- **Custom React hooks** for state management
- **Reusable components** and utility functions
- **Service layer** for API calls and complex processing
- **Comprehensive documentation** and JSDoc comments

### Contributing

1. Read the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase structure
2. Follow the established patterns for new features
3. Add appropriate documentation and comments
4. Test changes thoroughly before submitting PRs

## Technical Details

- **Frontend**: React 18 with Material-UI components
- **Build Tool**: Vite for fast development and building
- **State Management**: Custom hooks with React's built-in state
- **External Libraries**:
  - `twl-linker` for TWL generation from USFM
  - `tsv-quote-converters` for quote processing
- **API Integration**: Door43 Content Service (DCS) for content fetching
- **Deployment**: Netlify-ready with build configurations

## How to Use

1. **Select a Bible book** from the dropdown menu
2. **Choose a branch** (defaults to 'master') for content fetching
3. **Load USFM content** via paste, upload, or fetch from DCS
4. **Optionally load existing TWL** for merging with generated content
5. **Click "Generate TWL"** to create the Translation Word List
6. **Use interactive table** to review and edit entries:
   - Delete rows with the trash icon (with undo capability)
   - Click disambiguation options to switch between alternatives
   - Click references to view Translation Notes
7. **Export your work** using the Download TSV button

## Workflow Integration

The app integrates seamlessly with the Door43 translation ecosystem:

- **DCS Content Fetching**: Automatically retrieves USFM and existing TWL files
- **Branch Support**: Works with any branch in the repositories
- **Standard Formats**: Exports in standard TSV format compatible with DCS
- **Translation Notes Links**: Direct integration with TN viewing

---

This tool streamlines the Translation Word List creation process while maintaining compatibility with the Door43 translation workflow.
