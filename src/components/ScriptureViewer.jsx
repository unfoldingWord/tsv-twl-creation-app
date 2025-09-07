/**
 * ScriptureViewer - Advanced component with word alignment and lexicon features
 * Updated to use usfm-js for proper USFM parsing and lexicon extraction
 */

import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { toJSON } from 'usfm-js';
import { BibleBookData } from '../common/books';
import { fetchUSFMContent } from '../services/apiService';
import { normalizeHebrewText } from '../utils/unlinkedWords';

// Styled components
const ViewerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ViewerContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 95vw;
  max-height: 95vh;
  overflow: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: #666;

  &:hover {
    background: #f0f0f0;
  }
`;

const ScriptureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  max-height: 70vh;
  overflow: auto;
`;

const ScriptureCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #fafafa;
`;

const CardTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  text-align: center;
`;

const ScriptureText = styled.div`
  line-height: 1.6;
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #333;
`;

const AlignedWord = styled.span.withConfig({
  shouldForwardProp: (prop) => !['isHighlighted', 'isAligned'].includes(prop),
})`
  background: ${(props) => (props.isHighlighted ? '#ffeb3b' : props.isAligned ? '#e3f2fd' : 'transparent')};
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  border: ${(props) => (props.isHighlighted ? '2px solid #f57c00' : 'none')};
  position: relative;

  &:hover {
    background: #bbdefb;
    border: 2px solid #2196f3;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  max-width: 300px;
  font-size: 14px;
  color: #333;
  pointer-events: none;
  white-space: nowrap;
`;

const StrongNumber = styled.sup`
  font-size: 10px;
  color: #666;
  margin-left: 2px;
  font-weight: bold;
`;

// Helper function to recursively extract text and lexicon data from verseObjects
const extractVerseContent = (verseObjects) => {
  let text = '';
  const lexiconData = [];

  const processObject = (obj) => {
    // Handle text objects
    if (obj.type === 'text') {
      text += obj.text || '';
      return;
    }

    // Handle word objects
    if (obj.type === 'word' && obj.text) {
      text += obj.text;
      return;
    }

    // Handle milestone objects (alignment markers)
    if (obj.type === 'milestone') {
      // Extract lexicon data from milestone attributes
      const strong = obj.strong || obj.attributes?.strong || '';
      const lemma = obj.lemma || obj.attributes?.lemma || '';
      const morph = obj.morph || obj.attributes?.morph || '';
      const content = obj.content || '';

      // Process children to get the translated text
      let childText = '';
      const childLexicon = [];

      if (obj.children) {
        obj.children.forEach((child) => {
          if (child.type === 'word' && child.text) {
            childText += child.text;
            // Associate milestone lexicon data with each word
            if (strong || lemma) {
              childLexicon.push({
                word: child.text,
                strongs: strong,
                lemma: lemma,
                morphology: morph,
                definition: lemma || content || '',
                originalWord: content || lemma || '',
              });
            }
          } else if (child.type === 'text') {
            childText += child.text || '';
          } else if (child.type === 'milestone') {
            // Handle nested milestones recursively
            // Extract lexicon data from the nested milestone
            const nestedStrong = child.strong || child.attributes?.strong || '';
            const nestedLemma = child.lemma || child.attributes?.lemma || '';
            const nestedMorph = child.morph || child.attributes?.morph || '';
            const nestedContent = child.content || '';

            // Process nested milestone's children
            if (child.children) {
              child.children.forEach((grandChild) => {
                if (grandChild.type === 'word' && grandChild.text) {
                  childText += grandChild.text;
                  // Use nested milestone's lexicon data for the word
                  if (nestedStrong || nestedLemma) {
                    console.log('Found nested milestone word:', {
                      word: grandChild.text,
                      strong: nestedStrong,
                      lemma: nestedLemma,
                      parentStrong: strong,
                      parentLemma: lemma,
                    });
                    childLexicon.push({
                      word: grandChild.text,
                      strongs: nestedStrong,
                      lemma: nestedLemma,
                      morphology: nestedMorph,
                      definition: nestedLemma || nestedContent || '',
                      originalWord: nestedContent || nestedLemma || '',
                    });
                  }
                } else if (grandChild.type === 'text') {
                  childText += grandChild.text || '';
                }
              });
            }
          }
        });
      }

      text += childText;
      lexiconData.push(...childLexicon);
      return;
    }

    // Handle any other objects that might have children
    if (obj.children) {
      obj.children.forEach((child) => {
        processObject(child);
      });
    }
  };

  verseObjects.forEach((obj) => processObject(obj));

  console.log('Extracted verse content:', {
    text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
    lexiconCount: lexiconData.length,
    lexiconSample: lexiconData.slice(0, 5),
  });

  return {
    text: text.trim(),
    lexicon: lexiconData,
  };
};

// Helper function to parse USFM content using usfm-js
const parseUSFMContent = (usfmContent, contentType = 'unknown') => {
  try {
    console.log(`Parsing ${contentType} USFM content with usfm-js...`);
    const usfmJSON = toJSON(usfmContent);

    // Debug specific verse for Jude 1:3
    if (usfmJSON.chapters?.['1']?.['3']?.verseObjects) {
      console.log(`${contentType} Jude 1:3 verse objects:`, JSON.stringify(usfmJSON.chapters['1']['3'].verseObjects, null, 2));
    }

    console.log(`${contentType} USFM JSON structure sample:`, JSON.stringify(usfmJSON.chapters?.['1']?.['1']?.verseObjects?.slice(0, 2), null, 2));
    const parsedChapters = {};

    if (usfmJSON.chapters) {
      Object.keys(usfmJSON.chapters).forEach((chapterKey) => {
        const chapterData = usfmJSON.chapters[chapterKey];
        const verses = {};

        Object.keys(chapterData).forEach((verseKey) => {
          if (verseKey !== 'front' && chapterData[verseKey]?.verseObjects) {
            const verseContent = extractVerseContent(chapterData[verseKey].verseObjects);
            verses[parseInt(verseKey)] = verseContent;

            // Special debug for verse 3 (Jude 1:3)
            if (parseInt(verseKey) === 3 && parseInt(chapterKey) === 1) {
              console.log(`🔍 Special debug for ${contentType} chapter ${chapterKey} verse ${verseKey}:`, {
                rawVerseObjects: chapterData[verseKey].verseObjects,
                extractedText: verseContent.text,
                extractedLexicon: verseContent.lexicon,
                salvationInText: verseContent.text.includes('salvation'),
                salvationLexiconEntries: verseContent.lexicon.filter((entry) => entry.word.toLowerCase().includes('salvation')),
              });
            }
          }
        });

        if (Object.keys(verses).length > 0) {
          parsedChapters[parseInt(chapterKey)] = verses;
        }
      });
    }

    console.log('Parsed', Object.keys(parsedChapters).length, 'chapters');
    return parsedChapters;
  } catch (error) {
    console.error('Error parsing USFM content:', error);
    return {};
  }
};

// ScriptureViewer Component - Advanced implementation with word alignment
const ScriptureViewer = ({ scriptureContext, onClose, dcsHost }) => {
  const [scriptureData, setScriptureData] = useState({
    original: {},
    ult: {},
    ust: {},
  });
  const [loading, setLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState(''); // Track cache status
  const [selectedWord, setSelectedWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Extract data from scriptureContext
  const { bookId, chapter, verse, quote: glQuote, origWords, occurrence } = scriptureContext || {};

  // Debug logging for Hebrew text
  useEffect(() => {
    if (scriptureContext) {
      console.log('ScriptureViewer context:', {
        bookId,
        chapter,
        verse,
        glQuote,
        origWords,
        occurrence,
        scriptureData,
      });
    }
  }, [scriptureContext, scriptureData]);

  // Build lexicon lookup from real USFM data parsed with usfm-js
  const lexiconLookup = React.useMemo(() => {
    const lookup = {};

    // Process all translations to build comprehensive lexicon data
    ['original', 'ult', 'ust'].forEach((translation) => {
      if (scriptureData[translation]) {
        Object.values(scriptureData[translation]).forEach((chapterData) => {
          Object.values(chapterData).forEach((verseData) => {
            if (verseData.lexicon) {
              verseData.lexicon.forEach((lexiconItem) => {
                if (lexiconItem.word && (lexiconItem.strongs || lexiconItem.lemma)) {
                  // For original language, use the word directly
                  if (translation === 'original') {
                    lookup[lexiconItem.word] = {
                      strongs: lexiconItem.strongs,
                      lemma: lexiconItem.lemma,
                      definition: lexiconItem.definition || lexiconItem.lemma || '',
                      morphology: lexiconItem.morphology,
                      originalWord: lexiconItem.originalWord,
                    };
                  } else {
                    // For English translations, create lowercase mapping
                    const wordKey = lexiconItem.word.toLowerCase();
                    if (!lookup[wordKey] || !lookup[wordKey].strongs) {
                      lookup[wordKey] = {
                        strongs: lexiconItem.strongs,
                        lemma: lexiconItem.lemma,
                        definition: lexiconItem.definition || lexiconItem.lemma || '',
                        morphology: lexiconItem.morphology,
                        originalWord: lexiconItem.originalWord,
                      };
                    }
                  }
                }
              });
            }
          });
        });
      }
    });

    console.log('Built lexicon lookup with', Object.keys(lookup).length, 'entries');
    console.log('Sample lexicon entries:', Object.entries(lookup).slice(0, 10));

    // Special debug for "salvation" word
    const salvationKey = 'salvation';
    if (lookup[salvationKey]) {
      console.log('✅ Found "salvation" in lexicon:', lookup[salvationKey]);
    } else {
      console.log('❌ "salvation" not found in lexicon');
      console.log(
        'Available words starting with "s":',
        Object.keys(lookup).filter((key) => key.startsWith('s'))
      );
    }

    return lookup;
  }, [scriptureData]);

  useEffect(() => {
    // Only fetch scripture data when book changes
    // Extract all chapters from the USFM files at once
    const loadScripture = async () => {
      // Check if we already have data for this book
      const hasBookData =
        scriptureData.original &&
        Object.keys(scriptureData.original).length > 0 &&
        scriptureData.ult &&
        Object.keys(scriptureData.ult).length > 0 &&
        scriptureData.ust &&
        Object.keys(scriptureData.ust).length > 0;

      if (hasBookData && !loading) {
        console.log('Using cached scripture data for book', bookId, '- chapters available:', Object.keys(scriptureData.original));
        setCacheStatus('Using cached data');
        setTimeout(() => setCacheStatus(''), 2000); // Clear status after 2 seconds
        return; // Don't refetch if we already have the data
      }

      setLoading(true);
      setCacheStatus('Loading book from server...');

      try {
        console.log('Loading scripture data for book', bookId);
        // Fetch all three translations in parallel
        const [originalContent, ultContent, ustContent] = await Promise.all([
          fetchUSFMContent(bookId, 'original', dcsHost),
          fetchUSFMContent(bookId, 'ult', dcsHost),
          fetchUSFMContent(bookId, 'ust', dcsHost),
        ]);

        // Extract ALL chapters from each translation (not just the current chapter)
        const originalVerses = parseUSFMContent(originalContent, 'original'); // No chapter parameter = extract all
        const ultVerses = parseUSFMContent(ultContent, 'ult'); // No chapter parameter = extract all
        const ustVerses = parseUSFMContent(ustContent, 'ust'); // No chapter parameter = extract all

        setScriptureData({
          original: originalVerses, // Store all chapters
          ult: ultVerses, // Store all chapters
          ust: ustVerses, // Store all chapters
        });

        // Debug: Log quote matching for testing
        if (glQuote) {
          console.log('GLQuote Analysis:', {
            glQuote,
            occurrence,
            hasAmpersand: glQuote.includes(' & '),
            parts: glQuote.split(' & '),
            normalizedParts: glQuote.split(' & ').map((part) => normalizeHebrewText(part.trim())),
            caseSensitive: true,
          });
        }
      } catch (error) {
        console.error('Error loading scripture:', error);
        // Fallback to empty data if API fails
        setScriptureData({
          original: {},
          ult: {},
          ust: {},
        });
      } finally {
        setLoading(false);
        setCacheStatus('');
      }
    };

    if (bookId) {
      loadScripture();
    }
  }, [bookId, dcsHost]); // Only depend on bookId and dcsHost, NOT chapter

  // Determine if this is NT or OT using BibleBookData
  const isNT = React.useMemo(() => {
    if (!bookId) return false;
    const bookData = BibleBookData[bookId.toLowerCase()];
    return bookData ? bookData.testament === 'new' : false;
  }, [bookId]);

  // Function to clean word for comparison (removes punctuation and normalizes)
  const cleanWordForMatching = (word) => {
    if (!word) return '';

    // First apply Hebrew normalization, then remove punctuation
    let cleaned = normalizeHebrewText(word);

    // Remove punctuation but preserve Greek and Hebrew characters
    // \u0370-\u03FF = Greek and Coptic
    // \u1F00-\u1FFF = Greek Extended
    // \u0590-\u05FF = Hebrew
    cleaned = cleaned.replace(/[^\w\s\u0370-\u03FF\u1F00-\u1FFF\u0590-\u05FF]/g, '');

    return cleaned.trim().toLowerCase();
  };

  // Advanced quote matching function that handles & separators and occurrence
  const findQuoteMatches = (text, quote, targetOccurrence = 1) => {
    if (!quote || !text) return [];

    const words = text.split(/\s+/);
    // Clean words for comparison (removes punctuation and normalizes)
    const cleanedWords = words.map(cleanWordForMatching);

    // For quotes with &, we need to preserve the & separators but clean the individual parts
    // Split first, then clean each part
    const quoteParts = quote
      .split(' & ')
      .map((part) => {
        const cleanedPart = cleanWordForMatching(part);
        return cleanedPart.trim();
      })
      .filter((part) => part);

    console.log('🔍 Quote matching debug:', {
      originalQuote: quote,
      quoteParts,
      textSample: words.slice(0, 10).join(' '),
      cleanedTextSample: cleanedWords.slice(0, 10).join(' '),
    });

    // Additional validation
    if (quoteParts.length === 0) {
      console.log('No valid quote parts after cleaning and splitting:', { originalQuote: quote, quoteParts });
      return [];
    }

    if (quoteParts.length === 1) {
      // Simple case: no & separators, just find occurrences
      const cleanedQuote = quoteParts[0];
      return findSimpleMatches(cleanedWords, cleanedQuote, targetOccurrence, words);
    } else {
      // Complex case: & separators require sequential matching
      return findSequentialMatches(cleanedWords, quoteParts, targetOccurrence, words);
    }
  };

  // Find simple matches (no & separators)
  const findSimpleMatches = (cleanedWords, cleanedQuote, targetOccurrence, originalWords) => {
    const matches = [];
    let occurrenceCount = 0;

    // If quote has multiple words, find the sequence
    const quoteWords = cleanedQuote.split(/\s+/).filter((word) => word);
    if (quoteWords.length > 1) {
      for (let i = 0; i <= cleanedWords.length - quoteWords.length; i++) {
        let match = true;
        for (let j = 0; j < quoteWords.length; j++) {
          if (cleanedWords[i + j] !== quoteWords[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          occurrenceCount++;
          if (occurrenceCount === targetOccurrence) {
            // Add all words in the sequence using original words
            for (let j = 0; j < quoteWords.length; j++) {
              matches.push({
                startIndex: i + j,
                endIndex: i + j,
                word: originalWords[i + j],
              });
            }
            break;
          }
        }
      }
    } else {
      // Single word quote
      for (let i = 0; i < cleanedWords.length; i++) {
        if (cleanedWords[i] === cleanedQuote) {
          occurrenceCount++;
          if (occurrenceCount === targetOccurrence) {
            matches.push({
              startIndex: i,
              endIndex: i,
              word: originalWords[i],
            });
            break;
          }
        }
      }
    }

    return matches;
  };

  // Find sequential matches with & separators
  const findSequentialMatches = (cleanedWords, quoteParts, targetOccurrence, originalWords) => {
    console.log('findSequentialMatches called:', { quoteParts, targetOccurrence, textLength: cleanedWords.length });
    console.log('🔍 Debug quote parts and text:', {
      originalQuote: quoteParts.join(' & '),
      cleanedText: cleanedWords.join(' '),
      textSample: cleanedWords.slice(0, 20).join(' '),
    });

    // Validate inputs
    if (!quoteParts || quoteParts.length === 0) {
      console.log('No valid quote parts found');
      return [];
    }

    const matches = [];
    let globalOccurrenceCount = 0;

    // For & separated quotes, the occurrence applies only to the first part
    const firstPart = quoteParts[0];
    if (!firstPart) {
      console.log('First part is undefined or empty');
      return [];
    }

    const firstPartWords = firstPart.split(/\s+/).filter((word) => word);
    console.log('First part analysis:', { firstPart, firstPartWords, firstPartLength: firstPartWords.length });

    // Validate first part has actual words
    if (firstPartWords.length === 0) {
      console.log('First part has no valid words after cleaning');
      return [];
    }

    // Find the target occurrence of the first part (which may be multiple words)
    for (let i = 0; i <= cleanedWords.length - firstPartWords.length; i++) {
      let match = true;
      for (let j = 0; j < firstPartWords.length; j++) {
        const textWord = cleanedWords[i + j];
        const quoteWord = firstPartWords[j];
        if (textWord !== quoteWord) {
          console.log(`🔍 Mismatch at word ${j}: "${textWord}" vs "${quoteWord}" at position ${i + j}`);
          match = false;
          break;
        }
      }
      if (match) {
        globalOccurrenceCount++;
        console.log(
          `✅ Found occurrence ${globalOccurrenceCount} of first part "${firstPart}" at position ${i}:`,
          firstPartWords.map((_, j) => originalWords[i + j])
        );
        if (globalOccurrenceCount === targetOccurrence) {
          // Found the target occurrence of the first part
          // Add all words in the first part to matches
          for (let j = 0; j < firstPartWords.length; j++) {
            matches.push({
              startIndex: i + j,
              endIndex: i + j,
              word: originalWords[i + j],
            });
          }
          console.log('Added first part matches:', matches);

          // Now try to find the remaining parts starting from after the first part
          const remainingParts = quoteParts.slice(1);
          console.log('Looking for remaining parts:', remainingParts);
          const sequenceMatch = findRemainingParts(cleanedWords, i + firstPartWords.length, remainingParts, originalWords);
          if (sequenceMatch) {
            matches.push(...sequenceMatch);
            console.log('Found complete sequence:', matches);
            return matches; // Return immediately with complete matches
          } else {
            console.log('Could not find remaining parts - returning empty array');
            return []; // If not all parts found, return empty array (no highlighting)
          }
        }
      }
    }

    return matches;
  };

  // Find remaining parts after the first part has been matched
  const findRemainingParts = (cleanedWords, startIndex, remainingParts, originalWords) => {
    console.log('findRemainingParts called:', { startIndex, remainingParts, availableWords: cleanedWords.slice(startIndex, startIndex + 20) });

    // Validate inputs
    if (!remainingParts || remainingParts.length === 0) {
      console.log('No remaining parts to find');
      return [];
    }

    const matches = [];
    let currentWordIndex = startIndex;

    for (let partIndex = 0; partIndex < remainingParts.length; partIndex++) {
      const part = remainingParts[partIndex];

      // Validate part
      if (!part || typeof part !== 'string') {
        console.log(`Invalid part at index ${partIndex}:`, part);
        return null; // Return null to indicate failure
      }

      const partWords = part.split(/\s+/).filter((word) => word);
      console.log(`Looking for part ${partIndex}: "${part}" (words: ${partWords}) starting from index ${currentWordIndex}`);

      // If no valid words in this part, skip it
      if (partWords.length === 0) {
        console.log(`No valid words in part ${partIndex}, skipping`);
        continue;
      }

      // Find this part, allowing for gaps (0 or more words between parts)
      let found = false;
      for (let j = currentWordIndex; j <= cleanedWords.length - partWords.length; j++) {
        let match = true;
        for (let k = 0; k < partWords.length; k++) {
          const textWord = cleanedWords[j + k];
          const quoteWord = partWords[k];
          if (textWord !== quoteWord) {
            console.log(`Word mismatch in remaining parts at position ${j + k}: "${textWord}" vs "${quoteWord}"`);
            match = false;
            break;
          }
        }

        if (match) {
          console.log(
            `Found part "${part}" at position ${j}:`,
            partWords.map((_, k) => originalWords[j + k])
          );
          // Add all words in this part to matches
          for (let k = 0; k < partWords.length; k++) {
            matches.push({
              startIndex: j + k,
              endIndex: j + k,
              word: originalWords[j + k],
            });
          }
          currentWordIndex = j + partWords.length;
          found = true;
          break;
        }
      }

      if (!found) {
        console.log(`Part "${part}" not found starting from index ${currentWordIndex}`);
        return null; // Part not found
      }
    }

    console.log('All remaining parts found:', matches);
    return matches;
  };

  // Function to render aligned words with tooltips
  const renderAlignedText = (text, isOriginal = false, translation = 'ult') => {
    console.log('renderAlignedText called:', { text, isOriginal, translation });
    if (!text || text.trim() === '') {
      console.log('No text to render, returning placeholder');
      return <span style={{ color: '#999' }}>[No text available]</span>;
    }

    const words = text.split(/\s+/);
    const elements = [];

    // Determine what to highlight based on translation type
    let matches = [];
    if (isOriginal && origWords) {
      // For original languages, use origWords for highlighting
      console.log('Original text debugging:', {
        origWords,
        occurrence,
        text: text.substring(0, 200),
        normalizedText: normalizeHebrewText(text).substring(0, 200),
        normalizedOrigWords: normalizeHebrewText(origWords),
        words: words.slice(0, 10),
      });
      matches = findQuoteMatches(text, origWords, occurrence);
    } else if (translation === 'ult' && glQuote) {
      // Only highlight ULT with GLQuote, not UST
      matches = findQuoteMatches(text, glQuote, occurrence);
    }
    // UST should not be highlighted with GLQuote

    // Debug: Log matches found
    if (matches.length > 0) {
      console.log(`Quote matches found in ${translation}:`, { text: text.substring(0, 100) + '...', quote: isOriginal ? origWords : glQuote, occurrence, matches });
    } else if ((isOriginal && origWords) || (translation === 'ult' && glQuote)) {
      console.log(`No matches found in ${translation}:`, { text: text.substring(0, 100) + '...', quote: isOriginal ? origWords : glQuote, occurrence });
    }

    words.forEach((word, index) => {
      // Check if this word is part of the matched quote sequence
      const isHighlighted = matches.some((match) => index >= match.startIndex && index <= match.endIndex);

      // Find alignment data for this word (for tooltips)
      let alignmentInfo = null;
      if (isOriginal) {
        // For original language, look up directly in lexicon
        alignmentInfo = lexiconLookup[word] || null;
        console.log(`Original word "${word}" alignment:`, alignmentInfo);
      } else {
        // For English translations, use lowercase lookup in lexicon
        // Clean the word by removing punctuation for lexicon lookup
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        alignmentInfo = lexiconLookup[cleanWord] || null;
        console.log(`English word "${word}" (cleaned: "${cleanWord}") alignment:`, alignmentInfo);

        // Special debug for "salvation"
        if (cleanWord === 'salvation') {
          console.log('🔍 SALVATION DEBUG:', {
            originalWord: word,
            cleanWord,
            hasKey: cleanWord in lexiconLookup,
            alignmentInfo,
            allKeysWithSalvation: Object.keys(lexiconLookup).filter((key) => key.includes('salvation')),
          });
        }
      }

      elements.push(
        <AlignedWord
          key={`${word}-${index}`}
          isHighlighted={isHighlighted}
          isAligned={!!alignmentInfo}
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            console.log('Word clicked:', word, 'alignmentInfo:', alignmentInfo, 'isOriginal:', isOriginal);
            if (alignmentInfo) {
              // If clicking the same word, close the tooltip
              if (selectedWord?.strongs === alignmentInfo.strongs) {
                console.log('Closing tooltip for same word');
                setSelectedWord(null);
              } else {
                // Otherwise, show tooltip for this word
                console.log('Showing tooltip for word:', word, alignmentInfo);
                setSelectedWord(alignmentInfo);
                // Calculate tooltip position
                const rect = e.target.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 10, // Position above the word
                });
              }
            } else {
              console.log('No alignment info found for word:', word);
            }
          }}
        >
          {word}
          {alignmentInfo && !isOriginal && selectedWord?.strongs === alignmentInfo.strongs && <StrongNumber>{alignmentInfo.strongs}</StrongNumber>}
        </AlignedWord>
      );

      // Add space between words
      if (index < words.length - 1) {
        elements.push(' ');
      }
    });

    return elements;
  };

  // Get context verses for a specific translation (current verse ± 2 verses)
  const getContextVerses = (translation) => {
    console.log('getContextVerses called:', { translation, scriptureData, chapter, verse });
    if (!scriptureData[translation] || !scriptureData[translation][chapter]) {
      console.log('No data found for:', { translation, chapter });
      return [];
    }

    const verses = [];
    const currentChapter = scriptureData[translation][chapter];
    console.log('Current chapter data:', currentChapter);

    for (let i = Math.max(1, verse - 2); i <= Math.min(Object.keys(currentChapter).length, verse + 2); i++) {
      if (currentChapter[i]) {
        console.log(`Verse ${i} data:`, currentChapter[i]);
        verses.push({
          verse: i,
          text: currentChapter[i].text, // Extract just the text string, not the whole object
          morphology: [], // Empty for now until morphological data is working
          isCurrent: i === verse,
        });
      }
    }

    console.log('Returning verses:', verses);
    return verses;
  };

  if (!scriptureContext || !bookId) {
    return (
      <ViewerContainer>
        <ViewerContent>
          <p>No scripture context provided</p>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ViewerContent>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer>
      <ViewerContent onClick={() => setSelectedWord(null)}>
        <Header>
          <h2 style={{ margin: 0 }}>
            📖 Scripture for {BibleBookData[bookId].title} {chapter}:{verse}
          </h2>
          {selectedWord && (
            <div style={{ fontSize: '12px', color: '#007acc', marginTop: '4px' }}>
              🔍 Selected: {selectedWord.originalWord || selectedWord.lemma} ({selectedWord.strongs})
            </div>
          )}
          {glQuote && occurrence && (
            <div style={{ fontSize: '14px', color: '#666', marginLeft: '20px' }}>
              🎯 Highlighting: "<strong>{glQuote}</strong>" (occurrence {occurrence})
              {origWords && origWords !== glQuote && (
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {isNT ? '🏺 Greek Original' : '📜 Hebrew Original'} Original: "{origWords} (Occurrence {occurrence})"
                </div>
              )}
            </div>
          )}
          <CloseButton onClick={onClose} title="Close Scripture Viewer">
            ✕
          </CloseButton>
        </Header>

        {/* Tooltip for word information */}
        {selectedWord && (
          <Tooltip
            style={{
              position: 'fixed',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          >
            <div>
              <strong>Original:</strong> {selectedWord.originalWord || selectedWord.lemma}
            </div>
            <div>
              <strong>Strong's:</strong> {selectedWord.strongs}
            </div>
            <div>
              <strong>Definition:</strong> {selectedWord.definition}
            </div>
            {selectedWord.morphology && (
              <div>
                <strong>Morphology:</strong> {selectedWord.morphology}
              </div>
            )}
          </Tooltip>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading scripture...</p>
            {cacheStatus && <p style={{ fontSize: '14px', color: '#666' }}>{cacheStatus}</p>}
          </div>
        ) : (
          <ScriptureGrid>
            {/* Original Language Card */}
            <ScriptureCard>
              <CardTitle>{isNT ? 'Greek Original' : 'Hebrew Original'}</CardTitle>
              <ScriptureText>
                {(() => {
                  const verses = getContextVerses('original');
                  console.log('Rendering original verses:', verses);
                  return verses.map(({ verse: v, text, morphology, isCurrent }) => (
                    <div
                      key={v}
                      style={{
                        marginBottom: '10px',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        background: isCurrent ? '#e3f2fd' : 'transparent',
                        padding: isCurrent ? '8px' : '0',
                        borderRadius: '4px',
                      }}
                    >
                      <strong>{v}</strong> {renderAlignedText(text, true, 'original')}
                    </div>
                  ));
                })()}
              </ScriptureText>
            </ScriptureCard>

            {/* English ULT Card */}
            <ScriptureCard>
              <CardTitle>English ULT</CardTitle>
              <ScriptureText>
                {getContextVerses('ult').map(({ verse: v, text, morphology, isCurrent }) => (
                  <div
                    key={v}
                    style={{
                      marginBottom: '10px',
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      background: isCurrent ? '#e3f2fd' : 'transparent',
                      padding: isCurrent ? '8px' : '0',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{v}</strong> {renderAlignedText(text, false, 'ult')}
                  </div>
                ))}
              </ScriptureText>
            </ScriptureCard>

            {/* English UST Card */}
            <ScriptureCard>
              <CardTitle>English UST</CardTitle>
              <ScriptureText>
                {getContextVerses('ust').map(({ verse: v, text, morphology, isCurrent }) => (
                  <div
                    key={v}
                    style={{
                      marginBottom: '10px',
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      background: isCurrent ? '#e3f2fd' : 'transparent',
                      padding: isCurrent ? '8px' : '0',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{v}</strong> {renderAlignedText(text, false, 'ust')}
                  </div>
                ))}
              </ScriptureText>
            </ScriptureCard>
          </ScriptureGrid>
        )}
      </ViewerContent>
    </ViewerContainer>
  );
};

export default ScriptureViewer;
