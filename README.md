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
- **Search**: Find specific references, words, or content across multiple columns
- **Disambiguation Filter**: Show only rows with disambiguation options
- **Variant Filter**: Show entries that are variants of other words
- **Merge Status Filter**: 
  - **Merged**: Show rows where existing content was merged with generated content
  - **Unmerged**: Show rows that are either from existing content only or newly generated
- **Invalid RC Links**: Show entries with problematic Translation Word links

**Search Functionality**:

The search feature allows you to find content across multiple columns with different matching strategies:

**Exact Match Columns** (case-insensitive):
- **Reference**: Search for exact Bible references (e.g., "1:1", "gen 1:1")
- **Strongs**: Search for exact Strong's numbers (e.g., "G123", "h456")

**Exact Match Columns** (case-sensitive):
- **Merge Status**: Search for exact status values ("OLD", "NEW", "MERGED")

**Partial Match Columns** (case-insensitive, searches within text):
- **OrigWords**: Search within original language words
- **TWLink**: Search within Translation Word links
- **GLQuote**: Search within Gateway Language quotes
- **Disambiguation**: Search within disambiguation options
- **Variant of**: Search within variant relationships
- **ID**: Search within row IDs
- **Tags**: Search within tag values

**Search Tips**:
- Search is performed across all available columns simultaneously
- Results are shown if the search term matches ANY of the columns
- Use exact matches for precise filtering (references, Strong's numbers, merge status)
- Use partial matches for broader searches (words, links, quotes)
- Search is case-insensitive for most columns, but case-sensitive for merge status values

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

4. **View Scripture Context**: Click the book icon (📖) to open the Scripture Viewer
   - Shows the aligned original Hebrew/Greek words with English translations
   - Displays lexicon data with Strong's numbers, lemmas, and morphology
   - Includes context verses (the target verse plus surrounding verses)
   - Words with lexicon data are highlighted and clickable for detailed information

5. **Translation Word Articles**:
   - **Hover over TWLink or Disambiguation links**: See a tooltip with the article's title/terms
   - **Click TWLink**: Opens the full Translation Word article in a modal popup
   - **View on DCS**: From the article modal, click "View on DCS" to open the article on the DCS website

6. **Handle Disambiguations**:
   - **Hover over disambiguation links**: See the terms for each alternative word definition
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
6. **Use the Scripture Viewer** to verify word alignments and context:
   - Click the book icon (📖) for any row to see the biblical text with word alignments
   - Verify that OrigWords and GLQuote match correctly in context
   - Check lexicon data for accuracy of Strong's numbers and lemmas
7. **Use filters to focus on specific issues**:
   - Start with "Unmerged" to review new/old content
   - Check "Invalid RC Links" for broken references
   - Review "Disambiguation" entries for multiple word options
8. **Make necessary edits**:
   - Delete incorrect rows (single row deletion)
   - Unlink problematic words (affects all instances globally)
   - Edit TWLinks for better accuracy
   - Select appropriate disambiguation options using hover tooltips for guidance

### Phase 3: Quality Control
9. **Handle disambiguation options**:
   - Hover over disambiguation links to preview terms for each option
   - Click through disambiguation links to select the best option
   - Clear disambiguations that aren't needed
10. **Verify Translation Word articles**:
   - Hover over TWLinks to quickly check article terms
   - Click TWLinks to read full articles and ensure they match the biblical context
   - Use the Scripture Viewer to confirm word alignments make sense
11. **Review variant relationships** using the variant filter
12. **Check merge status** - ensure merged content looks correct
13. **Use the search function** to find and fix specific issues

### Phase 4: Finalization
12. **Save your work to file** for backup and collaboration
13. **Final review** - go through filters one more time
14. **Commit to DCS** when completely satisfied with the results
15. **Share the Pull Request link** with reviewers if needed

## Additional Features

### Scripture Viewer

The Scripture Viewer provides advanced biblical text analysis and word alignment features:

**Accessing the Scripture Viewer**:
- Click the book icon (📖) in any table row to open the Scripture Viewer for that specific verse

**Features**:
- **Multi-language Display**: Shows original Hebrew/Greek text alongside English translations (ULT and UST)
- **Word Alignment**: Visual highlighting shows how original language words align with English translations
- **Lexicon Integration**: Click on any word to see detailed lexical information:
  - Strong's numbers and lemmas
  - Morphological analysis (grammatical information)
  - English glosses and meanings
- **Context Verses**: Displays the target verse plus several verses before and after for better understanding
- **Interactive Highlighting**: Words matching your TWL entry are automatically highlighted
- **Punctuation Handling**: Smart matching works even when words have punctuation (commas, periods, etc.)

**How Word Alignment Works**:
- Original language words (Hebrew/Greek) show lexical data when clicked
- English words show alignment information linking back to the original language
- Highlighting shows the specific words mentioned in your TWL entry
- Supports complex quotes with multiple word parts separated by "&"

### Translation Word Article Integration

**Hover Tooltips**:
- **TWLink Column**: Hover over any Translation Word link to see the article's main terms
- **Disambiguation Links**: Hover over disambiguation options to preview their specific terms
- Tooltips are loaded dynamically from the Translation Word articles

**Article Viewer**:
- **Click TWLink**: Opens the full Translation Word article in an elegant modal popup
- **Formatted Content**: Articles are displayed with proper markdown formatting (headings, lists, links, etc.)
- **Scrollable Content**: Long articles have scrollbars for easy reading
- **DCS Integration**: Click "View on DCS" to open the article on the Door43 Content Service website
- **Easy Navigation**: Close with the X button to return to your work

**Other Features**:

- **Reference Links**: Click any Bible reference to open Translation Notes in a new window
- **Long Text Tooltips**: Hover over long content to see full details in a tooltip
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

