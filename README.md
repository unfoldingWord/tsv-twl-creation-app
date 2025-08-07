# TSV TN Cleanup & Quote Converter App

A web application for converting and cleaning up Translation Notes (TN) TSV files, specifically designed to work with Door43 Content Service (DCS) repositories.

## What it does

This app helps translators and editors process Translation Notes TSV files by:

1. **Fetching TSV files** from git.door43.org by selecting a Bible book and branch, or by pasting/uploading content directly
2. **Converting quotes** from English (ULT) to original language (Greek/Hebrew)
3. **Standardizing quotes** by converting to English and back to original languages
4. **Merging with DCS** to combine your rows with the full TN file from the repository
5. **Creating GL Quote columns** with English text from the Quote field
6. **Converting straight quotes** to curly quotes for proper typography

## Features

### Input Options

- **Paste text** directly from clipboard
- **Upload TSV file** from your computer
- **Fetch from DCS** - automatically downloads the TN file for your selected book and branch

### Conversion Options

The app provides several checkbox options for processing:

1. **Convert English (ULT) quotes to Greek/Hebrew** in the `Quote` field
2. **Standardize/Fix all Quotes** by converting to English and then back to Greek/Hebrew
3. **Merge with the full TN file from DCS** and copy to clipboard to paste to DCS
4. **Create GL Quote and Occurrence columns** with the English from the Quote field
5. **Convert all single/double straight quotes** to curly quotes

### Display Features

The converted results are shown in a paginated table with filtering options:

- **Show only converted rows** - displays only the rows you provided
- **Show only changed rows** - highlights rows that were modified during conversion
- **Show only QUOTE_NOT_FOUND rows** - filters to show rows where quotes couldn't be converted
- **Diff highlighting** - yellow highlighting shows differences, red shows errors

### DCS Integration

- **Copy to clipboard** - copies the converted TSV content for manual pasting
- **Paste into DCS Editor** - copies content and opens the DCS file editor in a new window
- **Direct DCS links** - provides links to view the source files on DCS

## How to Use

1. Select a Bible book from the dropdown
2. Choose a branch (defaults to 'master')
3. Input your TSV content via paste, upload, or fetch from DCS
4. Select your desired conversion options using the checkboxes
5. Click "Convert" to process the file
6. Review the results in the table below
7. Use "Copy" or "Paste into DCS Editor" to save your work

## Technical Details

- Built with React and Material-UI
- Uses the [`tsv-quote-converters`](https://github.com/unfoldingWord/tsv-quote-converters) library for quote conversion
- Integrates with Door43 Content Service (DCS) API
- Deployed on Netlify

## DCS Workflow

When using "Paste into DCS Editor":

1. Converted content is copied to your clipboard
2. A new window opens with the DCS file editor
3. Select all existing text in the editor and paste your converted content
4. Create a new branch (recommended: `<username>-tc-create-1`)
5. Commit your changes

---

This tool streamlines the process of converting Translation Notes files while maintaining integration with the Door43 translation ecosystem.
# tsv-twl-creation-app
