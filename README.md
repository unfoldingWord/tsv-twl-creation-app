# TSV TWL Creation App

A React web application for creating and managing Translation Word Lists (TWL) from USFM content. This app helps translators and editors efficiently create, edit, and maintain high-quality TWL files with advanced features for collaboration and quality control.

## Quick Start Guide

### 1. Select a Bible Book and Branch

1. **Choose a Bible Book**: Select from the dropdown menu (e.g., "Genesis (gen)", "Matthew (mat)")
2. **Select a Branch**: Choose a branch from the DCS repository (defaults to 'master')
   - The branch is used when fetching existing TWL files from DCS
   - If you're only working with local files or pasted content, the branch selection is optional

### 2. Import Existing TWL Content (Optional)

You have three ways to import existing TWL content for merging or direct editing:

#### Method 1: Paste Text
- Click **"Paste text"** and the app will read your clipboard
- Paste TWL content directly into the text area

#### Method 2: Upload File
- Click **"Import a saved TSV file"** to upload a .tsv file from your computer
- This works with both standard 6-column TWL files and extended format files from this app

#### Method 3: Fetch from DCS
- Click **"Fetch en_twl/twl_BOOK.tsv"** to download the current TWL file from DCS
- Uses the selected branch to fetch the appropriate version

#### Import Formats Supported:
- **6-column format**: For merging with newly generated TWLs
- **8-12 column format**: Extended format files (exported from this app) can be loaded directly into table view

### 3. Generate or Load TWL Content

- **Generate TWLs**: Creates new TWL entries automatically from USFM using the twl-generator library
- **Load into Table View**: If you imported an extended format file, this loads it directly without generation

### 4. Work with the Interactive Table

#### Persistent Work
- Your work is automatically saved to your browser's local storage
- You can close the browser and return later - your work will be preserved
- This works across browser sessions until you clear your browser data

#### Table Features

**Filtering Options**:
- **Search**: Find specific references, words, or content
- **Disambiguation Filter**: Show only rows with disambiguation options
- **Variant Filter**: Show entries that are variants of other words
- **Merge Status Filter**: 
  - **Merged**: Show rows where existing content was merged with generated content
  - **Unmerged**: Show rows that are either from existing content only or newly generated
- **Invalid RC Links**: Show entries with problematic Translation Word links

**Row Operations**:

1. **Delete Single Row**: Click the trash icon (🗑️) to remove just that specific row
   - This only affects the clicked row
   - Use the **Undo** button to reverse this action

2. **Unlink Word**: Click the unlink icon (🔗) to remove all instances of that word
   - Removes ALL rows with the same OrigWords and TWLink combination
   - Also prevents this word from appearing in future TWL generations
   - This affects all users of the app globally - use carefully!

3. **Edit TWLink**: Click the pencil icon (✏️) to modify the Translation Word link
   - Allows you to correct or change which Translation Word article this entry links to

4. **Handle Disambiguations**:
   - **Click disambiguation links**: Switch between alternative word definitions
   - **Clear disambiguations**: Click the checkbox in the Disambiguation column to remove all disambiguation options

#### Advanced Features

**Raw Text Editing**:
- Switch to **"Raw Text"** mode to edit the TSV content directly
- Click **"Save & Return to Table View"** when finished
- Useful for bulk edits or complex changes

**Undo Functionality**:
- **Single-level undo**: Reverses your most recent change
- Available after row deletions, disambiguations, and other table modifications
- Only remembers one step back

### 5. Manage Unlinked Words

Click **"Manage Unlinked Words"** to access the global unlinked words system:

- **View all unlinked words**: See what words have been unlinked across all books
- **Remove words from unlinked list**: Re-enable words that were previously unlinked
- **Global impact**: Changes here affect all users of the app
- **Purpose**: Prevents problematic or incorrect word links from appearing in future TWL generations

### 6. Save and Share Your Work

**Save to File**:
- Click **"Save TWLs to File"** to download your complete work
- Creates a .tsv file with all columns (8-12 columns depending on content)
- Others can import this file into the app to continue your work
- Useful for collaboration and backup

**Share with Others**:
- Send your exported file to other translators or editors
- They can import it using the "Import a saved TSV file" option
- Preserves all your edits, disambiguations, and merge status

### 7. Commit to DCS (Final Step)

When your TWL is complete and reviewed:

1. Click **"Commit to DCS"**
2. Enter your name and email address
3. Add an optional commit message
4. Click **"Commit & Create PR"**

**What happens**:
- Only the first 6 columns (standard TWL format) are uploaded to DCS
- A new branch is created with your changes
- A Pull Request is automatically opened for review
- The extended columns (Strongs, Disambiguation, etc.) are not included in DCS

**Before committing, ensure**:
- All disambiguation options have been reviewed and selected
- Variant word relationships are correct
- Unmerged rows have been reviewed (decide if they should stay or be removed)
- You've checked for any invalid RC links using the filter

## Complete Workflow

Here's the recommended step-by-step process:

### Phase 1: Setup and Import
1. **Select your target Bible book**
2. **Choose appropriate branch** (if fetching from DCS)
3. **Import existing TWL content** (if available) using paste, upload, or fetch
4. **Generate new TWLs** or load extended format content

### Phase 2: Review and Edit
5. **Review the generated content** in table view
6. **Use filters to focus on specific issues**:
   - Start with "Unmerged" to review new/old content
   - Check "Invalid RC Links" for broken references
   - Review "Disambiguation" entries for multiple word options
7. **Make necessary edits**:
   - Delete incorrect rows (single row deletion)
   - Unlink problematic words (affects all instances globally)
   - Edit TWLinks for better accuracy
   - Select appropriate disambiguation options

### Phase 3: Quality Control
8. **Handle disambiguation options**:
   - Click through disambiguation links to select the best option
   - Clear disambiguations that aren't needed
9. **Review variant relationships** using the variant filter
10. **Check merge status** - ensure merged content looks correct
11. **Use the search function** to find and fix specific issues

### Phase 4: Finalization
12. **Save your work to file** for backup and collaboration
13. **Final review** - go through filters one more time
14. **Commit to DCS** when completely satisfied with the results
15. **Share the Pull Request link** with reviewers if needed

## Additional Features

- **Reference Links**: Click any Bible reference to open Translation Notes in a new window
- **Hover Tooltips**: Long text content shows full details on hover
- **Column Visibility**: Control which columns are displayed
- **Automatic Validation**: The app checks TWL format and shows validation errors
- **Browser Compatibility**: Works in modern web browsers with localStorage support
- **Responsive Design**: Works on desktop and tablet devices

## Troubleshooting

- **Lost Work**: Check if your browser's localStorage was cleared
- **Import Errors**: Ensure your TSV file has the correct number of columns and headers
- **Generation Fails**: Verify the book selection and try again
- **DCS Commit Issues**: Check your internet connection and credentials

---

---

## For Developers

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
  - `twl-generator` for TWL generation from USFM
  - `tsv-quote-converters` for quote processing
- **API Integration**: Door43 Content Service (DCS) for content fetching
- **Deployment**: Netlify-ready with build configurations

---

This tool streamlines the Translation Word List creation process while maintaining compatibility with the Door43 translation workflow.

