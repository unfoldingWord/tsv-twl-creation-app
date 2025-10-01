# 📚 TSV TWL Creation App

<div align="center">

**🚀 A Powerful React Web Application for Creating and Managing Translation Word Lists (TWL)**

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.14.0-blue.svg)](https://mui.com/)
[![Vite](https://img.shields.io/badge/Vite-4.4.0-646CFF.svg)](https://vitejs.dev/)

*Transform USFM content into high-quality TWL files with advanced collaboration and quality control features*

[📖 Quick Start](#-quick-start-guide) • [🔍 Features](#-features) • [🛠️ Development](#-development) • [📚 Documentation](#-complete-workflow)

</div>

---

## 🎯 What Makes This App Special?

✨ **Smart Generation**: Automatically creates TWL entries from USFM content using advanced algorithms  
🔍 **Interactive Table**: Powerful search, filtering, and editing capabilities  
📖 **Scripture Viewer**: Integrated biblical text analysis with word alignments  
🎨 **Modern UI**: Clean, responsive Material-UI design  
🔄 **Real-time Collaboration**: Seamless integration with Door43 Content Service  
💾 **Auto-save**: Never lose your work with browser local storage  
🌍 **Multi-language Support**: Handles Hebrew, Greek, and English content

---

## 🚀 Quick Start Guide

### 1️⃣ 📖 Select a Bible Book and Branch

**Choose Your Book** 📚
- Select from the dropdown menu (e.g., "Genesis (gen)", "Matthew (mat)")
- Choose a branch from the DCS repository (defaults to 'master')
- Branch selection is used when fetching existing TWL files from DCS

### 2️⃣ 📥 Import Existing TWL Content (Optional)

**Three Ways to Import** 🔄

#### 📋 Method 1: Paste Text
- Click **"Paste text"** and the app will read your clipboard
- Paste TWL content directly into the text area

#### 📁 Method 2: Upload File
- Click **"Import a saved TSV file"** to upload a .tsv file from your computer
- Works with both standard 6-column TWL files and extended format files

#### ☁️ Method 3: Fetch from DCS
- Click **"Fetch en_twl/twl_BOOK.tsv"** to download current TWL from DCS
- Uses selected branch to fetch the appropriate version

**📋 Supported Formats:**
- **6-column format**: For merging with newly generated TWLs
- **8-12 column format**: Extended format files load directly into table view

### 3️⃣ ⚡ Generate or Load TWL Content

**Generate TWLs** 🛠️: Creates new TWL entries automatically from USFM using the twl-generator library  
**Load into Table View** 📊: If you imported extended format, loads directly without generation

---

## 🎮 Work with the Interactive Table

### 💾 Persistent Work
- 🔄 Your work is **automatically saved** to browser's local storage
- ⏰ Close browser and return later - your work is preserved!
- 🌐 Works across browser sessions until you clear browser data

### 🔧 Table Features

#### 🔍 Filtering & Search Options

**Search Functionality** 🕵️‍♂️

The search feature allows you to find content across multiple columns:

**🎯 Exact Match Columns** (case-insensitive):
- **📍 Reference**: Search for exact Bible references (e.g., "1:1", "gen 1:1")

**🎯 Exact Match Columns** (case-sensitive):
- **📊 Merge Status**: Search for exact status values ("OLD", "NEW", "MERGED")

**🔍 Partial Match Columns** (case-insensitive):
- **📝 OrigWords**: Search within original language words
- **🔗 TWLink**: Search within Translation Word links
- **💬 GLQuote**: Search within Gateway Language quotes
- **❓ Disambiguation**: Search within disambiguation options
- **🔄 Variant of**: Search within variant relationships
- **🆔 ID**: Search within row IDs
- **🏷️ Tags**: Search within tag values

**💡 Search Tips:**
- Search across all available columns simultaneously
- Results shown if search term matches ANY column
- Use exact matches for precise filtering
- Use partial matches for broader searches

**🎛️ Other Filters:**
- **❓ Disambiguation Filter**: Show only rows with disambiguation options
- **🔄 Variant Filter**: Show entries that are variants of other words
- **📊 Merge Status Filter**:
  - **✅ Merged**: Show rows where existing content was merged with generated content
  - **❌ Unmerged**: Show rows that are either from existing content only or newly generated
- **�️ Deleted Rows Filter**:
  - **👁️ Show Deleted Rows**: Show all rows including deleted ones
  - **🎯 Only Show Deleted Rows**: Show only deleted rows
- **�🔗 Invalid RC Links**: Show entries with problematic Translation Word links

#### 🎯 Row Operations

**🗑️ 1. Delete Single Row (Smart Persistent Deletion)**
- Click the trash icon (🗑️) to mark a row as deleted
- **🧠 Smart Memory**: Your deletions are remembered across sessions and future generations
- **🔄 Persistent Behavior**: 
  - When you **delete** a row, it will be automatically filtered out in all future TWL generations for this book
  - When you **restore** (undelete) a row, it will always appear in future generations
  - Deleted rows show with a "DELETED" prefix and are visually grayed out
- **🚫 Protection**: MERGED rows (existing TSV content) cannot be deleted to preserve existing work
- **↶ Restore**: Click the delete icon again on a DELETED row to restore it
- **⚠️ Note**: Only affects NEW and OLD rows; MERGED rows are protected from deletion

**🔗 2. Unlink Word**
- Click the unlink icon (🔗) to remove all instances of that word
- Removes ALL rows with the same OrigWords and TWLink combination
- Also prevents this word from appearing in future TWL generations
- ⚠️ **Global Impact**: Affects all users of the app - use carefully!

**✏️ 3. Edit TWLink**
- **Click anywhere in the TWLink column** (except on the link text itself) to quickly enter edit mode
- **Click directly on the link text** to open the Translation Word article modal
- Allows you to correct or change which Translation Word article this entry links to
- The TWLink column shows a subtle blue background on hover when clickable for editing

**📖 4. View Scripture Context**
- Click the book icon (📖) to open the Scripture Viewer
- Shows the aligned original Hebrew/Greek words with English translations
- Displays lexicon data with Strong's numbers, lemmas, and morphology
- Includes context verses (the target verse plus surrounding verses)
- Words with lexicon data are highlighted and clickable for detailed information

**🎨 5. Translation Word Articles**
- **👆 Hover over TWLink or Disambiguation links**: See a tooltip with the article's title/terms
- **🖱️ Click TWLink**: Opens the full Translation Word article in a modal popup
- **☁️ View on DCS**: From the article modal, click "View on DCS" to open the article on the DCS website

### 🧠 Smart Deletion System

The app features an advanced deletion system that remembers your choices across sessions and generations:

#### 🔄 How It Works:
1. **Delete a Row**: Marks the row with "DELETED" prefix and stores this decision in the cloud
2. **Future Generations**: Deleted rows are automatically filtered out when generating new TWLs
3. **Restore Feature**: Click delete again on a DELETED row to restore it permanently
4. **Cloud Sync**: Your deletion preferences sync across devices and persist forever

#### 🛡️ Protection Rules:
- **✅ Can Delete**: NEW rows (newly generated content)
- **✅ Can Delete**: OLD rows (existing content that wasn't merged)
- **🚫 Cannot Delete**: MERGED rows (existing TSV content that was successfully merged)

#### 💡 Use Cases:
- **Remove Errors**: Delete incorrectly generated entries that you never want to see again
- **Clean Up**: Remove unwanted translation word associations permanently
- **Quality Control**: Hide problematic entries while preserving good existing content

#### 🎯 Visual Indicators:
- **Regular Rows**: Normal appearance
- **DELETED Rows**: Grayed out with red text and "DELETED" prefix in Reference column
- **MERGED Rows**: Cannot be deleted (delete button disabled for these rows)

**⬆️ 6. Move Row Up/Down**
- **⬆️ Up Arrow**: Move row up within the same reference (verse)
- **⬇️ Down Arrow**: Move row down within the same reference (verse)
- **📍 Same Reference Only**: Can only move rows within the same Bible reference
- **🚫 Hidden States**:
  - Arrow buttons are completely hidden when search/filter is active
  - Up arrow disabled if it's the first row of a reference
  - Down arrow disabled if it's the last row of a reference
- **↶ Undo Support**: Moving rows enables the Undo button to reverse the action
- **📄 Cross-Page Movement**: If moving causes a row to move to another page, the table updates accordingly

**❓ 6. Handle Disambiguations**
- **👆 Hover over disambiguation links**: See the terms for each alternative word definition
- **🖱️ Click disambiguation links**: Switch between alternative word definitions
- **☑️ Clear disambiguations**: Click the checkbox in the Disambiguation column to remove all disambiguation options

---

## ⚡ Advanced Features

### 📝 Raw Text Editing
- 🔄 Switch to **"Raw Text"** mode to edit the TSV content directly
- 💾 Click **"Save & Return to Table View"** when finished
- 🛠️ Useful for bulk edits or complex changes

### ↶ Undo Functionality
- **Single-level undo**: Reverses your most recent change
- Available after row deletions, disambiguations, and other table modifications
- Only remembers one step back

---

## 🛠️ Manage Unlinked Words

**Click "Manage Unlinked Words"** 🔧 to access the global unlinked words system:

- **👀 View all unlinked words**: See what words have been unlinked across all books
- **➖ Remove words from unlinked list**: Re-enable words that were previously unlinked
- **🌍 Global impact**: Changes here affect all users of the app
- **🎯 Purpose**: Prevents problematic or incorrect word links from appearing in future TWL generations

---

## 💾 Save and Share Your Work

### 📁 Save to File
- Click **"Save TWLs to File"** 📥 to download your complete work
- Creates a .tsv file with all columns (8-12 columns depending on content)
- Others can import this file into the app to continue your work
- Useful for collaboration and backup

### 🤝 Share with Others
- Send your exported file to other translators or editors
- They can import it using the **"Import a saved TSV file"** option
- Preserves all your edits, disambiguations, and merge status

---

## 🚀 Commit to DCS (Final Step)

**When your TWL is complete and reviewed** ✅

1. **🖱️ Click "Commit to DCS"**
2. **👤 Enter your name and email address**
3. **💬 Add an optional commit message**
4. **📤 Click "Commit & Create PR"**

### 🔄 What Happens Next:
- **📊 Only the first 6 columns** (standard TWL format) are uploaded to DCS
- **🌿 A new branch is created** with your changes
- **🔄 A Pull Request is automatically opened** for review
- **📝 Extended columns** (Disambiguation, etc.) are not included in DCS

### ⚠️ Before Committing, Ensure:
- **❓ All disambiguation options** have been reviewed and selected
- **🔄 Variant word relationships** are correct
- **📊 Unmerged rows** have been reviewed (decide if they should stay or be removed)
- **🔗 Invalid RC links** have been checked using the filter

---

## 📋 Complete Workflow

**Here's the recommended step-by-step process** 🗺️

### 🏁 Phase 1: Setup and Import
1. **📖 Select your target Bible book**
2. **🌿 Choose appropriate branch** (if fetching from DCS)
3. **📥 Import existing TWL content** (if available) using paste, upload, or fetch
4. **⚡ Generate new TWLs** or load extended format content

### 🔍 Phase 2: Review and Edit
5. **👀 Review the generated content** in table view
6. **📖 Use the Scripture Viewer** to verify word alignments and context:
   - Click the book icon (📖) for any row to see the biblical text with word alignments
   - Verify that OrigWords and GLQuote match correctly in context
   - Check lexicon data for accuracy of Strong's numbers and lemmas
7. **🎛️ Use filters to focus on specific issues**:
   - Start with **"Unmerged"** to review new/old content
   - Check **"Invalid RC Links"** for broken references
   - Review **"Disambiguation"** entries for multiple word options
   - Check **"Variant of"** entries to verify any irregular forms of the article term used in the scripture
8. **✏️ Make necessary edits**:
   - Delete incorrect rows (single row deletion)
   - Unlink problematic words (affects all instances globally)
   - Edit TWLinks for better accuracy
   - Select appropriate disambiguation options using hover tooltips for guidance

### ✅ Phase 3: Quality Control
9. **❓ Handle disambiguation options**:
   - Hover over disambiguation links to preview terms for each option
   - Click through disambiguation links to select the best option
   - Clear disambiguations that aren't needed
10. **🎨 Verify Translation Word articles**:
   - Hover over TWLinks to quickly check article terms
   - Click TWLinks to read full articles and ensure they match the biblical context
   - Use the Scripture Viewer to confirm word alignments make sense
11. **🔄 Review variant relationships** using the variant filter
12. **📊 Check merge status** - ensure merged content looks correct
13. **🔍 Use the search function** to find and fix specific issues

### 🎯 Phase 4: Finalization
14. **💾 Save your work to file** for backup and collaboration
15. **🔄 Final review** - go through filters one more time
16. **🚀 Commit to DCS** when completely satisfied with the results
17. **📤 Share the Pull Request link** with reviewers if needed

---

## 🌟 Additional Features

### 📖 Scripture Viewer

**The Scripture Viewer provides advanced biblical text analysis** 🔬

#### 🚀 Accessing the Scripture Viewer:
- **🖱️ Click the book icon (📖) in any table row** to open the Scripture Viewer for that specific verse

#### ✨ Features:
- **🌍 Multi-language Display**: Shows original Hebrew/Greek text alongside English translations (ULT and UST)
- **🔗 Word Alignment**: Visual highlighting shows how original language words align with English translations
- **📚 Lexicon Integration**: Click on any word to see detailed lexical information:
  - Strong's numbers and lemmas
  - Morphological analysis (grammatical information)
  - English glosses and meanings
- **📄 Context Verses**: Displays the target verse plus several verses before and after for better understanding
- **🎯 Interactive Highlighting**: Words matching your TWL entry are automatically highlighted
- **⚡ Punctuation Handling**: Smart matching works even when words have punctuation (commas, periods, etc.)

#### 🔍 How Word Alignment Works:
- **🇮🇱🇬🇷 Original language words** (Hebrew/Greek) show lexical data when clicked
- **🇺🇸 English words** show alignment information linking back to the original language
- **✨ Highlighting** shows the specific words mentioned in your TWL entry
- **🔗 Supports complex quotes** with multiple word parts separated by "&"

### 🎨 Translation Word Article Integration

**Seamless integration with Translation Word articles** 📚

#### 👆 Hover Tooltips
- **🔗 TWLink Column**: Hover over any Translation Word link to see the article's main terms
- **❓ Disambiguation Links**: Hover over disambiguation options to preview their specific terms
- **⚡ Dynamic Loading**: Tooltips are loaded dynamically from the Translation Word articles

#### 🖱️ Article Viewer
- **🔗 Click TWLink**: Opens the full Translation Word article in an elegant modal popup
- **📝 Formatted Content**: Articles are displayed with proper markdown formatting (headings, lists, links, etc.)
- **📜 Scrollable Content**: Long articles have scrollbars for easy reading
- **☁️ DCS Integration**: Click "View on DCS" to open the article on the Door43 Content Service website
- **❌ Easy Navigation**: Close with the X button to return to your work

#### 🌟 Other Features
- **📍 Reference Links**: Click any Bible reference to open Translation Notes in a new window
- **💬 Long Text Tooltips**: Hover over long content to see full details in a tooltip
- **👁️ Column Visibility**: Control which columns are displayed
- **✅ Automatic Validation**: The app checks TWL format and shows validation errors
- **🌐 Browser Compatibility**: Works in modern web browsers with localStorage support
- **📱 Responsive Design**: Works on desktop and tablet devices

---

## 🔧 Troubleshooting

**Common Issues & Solutions** 🛠️

- **💾 Lost Work**: Check if your browser's localStorage was cleared
- **📥 Import Errors**: Ensure your TSV file has the correct number of columns and headers
- **⚡ Generation Fails**: Verify the book selection and try again
- **☁️ DCS Commit Issues**: Check your internet connection and credentials

---

---

## 👨‍💻 For Developers

<div align="center">

### 🛠️ Tech Stack
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.14.0-blue.svg)](https://mui.com/)
[![Vite](https://img.shields.io/badge/Vite-4.4.0-646CFF.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

</div>

### 📋 Prerequisites
- **Node.js** (v16 or higher) 🟢
- **pnpm** package manager 📦

### 🚀 Getting Started

1. **📥 Clone the repository**
   ```bash
   git clone https://github.com/unfoldingWord/tsv7-twl-creation-app.git
   cd tsv7-twl-creation-app
   ```

2. **📦 Install dependencies**
   ```bash
   pnpm install
   ```

3. **⚡ Start development server**
   ```bash
   pnpm run dev
   ```

4. **🌐 Open in browser**
   Navigate to `http://localhost:5173/`

### 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | 🚀 Start development server with hot reload |
| `pnpm run build` | 📦 Create production build |
| `pnpm run preview` | 👀 Preview production build locally |
| `pnpm run lint` | 🔍 Run ESLint for code quality checks |

### 🏗️ Architecture

**This application has been refactored into a modular, maintainable architecture** 🏛️

#### ✨ Key Architectural Highlights:
- **🧩 Modular structure** with separated concerns
- **🎣 Custom React hooks** for state management
- **🔄 Reusable components** and utility functions
- **🔧 Service layer** for API calls and complex processing
- **📚 Comprehensive documentation** and JSDoc comments

**📖 [ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation

### 🤝 Contributing

**Guidelines for Contributors** 👥

1. **📖 Read the [ARCHITECTURE.md](./ARCHITECTURE.md)** to understand the codebase structure
2. **🔄 Follow the established patterns** for new features
3. **📝 Add appropriate documentation** and comments
4. **🧪 Test changes thoroughly** before submitting PRs

---

## 📊 Technical Details

### 🎨 Frontend
- **⚛️ React 18** with Material-UI components
- **⚡ Vite** for fast development and building
- **🎣 Custom hooks** with React's built-in state

### 🔧 External Libraries
- **📚 twl-generator** for TWL generation from USFM
- **💬 tsv-quote-converters** for quote processing

### 🔗 API Integration
- **☁️ Door43 Content Service (DCS)** for content fetching
- **🚀 Netlify-ready** with build configurations

---

<div align="center">

**🎉 This tool streamlines the Translation Word List creation process while maintaining compatibility with the Door43 translation workflow.**

---

*Made with ❤️ by the unfoldingWord team*

</div>

