/**
 * ScriptureViewer - Advanced component with word alignment and lexicon features
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BibleBookData } from '../common/books';
import { fetchUSFMContent } from '../services/apiService';
import { extractVersesFromUSFM } from '../utils/usfmUtils';
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

const AlignedWord = styled.span`
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

// ScriptureViewer Component - Advanced implementation with word alignment
const ScriptureViewer = ({ scriptureContext, onClose, dcsHost }) => {
  const [scriptureData, setScriptureData] = useState({
    original: null,
    ult: null,
    ust: null,
  });
  const [loading, setLoading] = useState(true);
  const [hoveredWord, setHoveredWord] = useState(null);
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

  // Mock alignment data - in a real implementation, this would come from alignment APIs
  const mockAlignmentData = {
    // Greek/Hebrew words mapped to English words with lexicon data
    ἐν: {
      english: ['In', 'in', 'by', 'with'],
      strongs: 'G1722',
      lemma: 'ἐν',
      definition: 'in, by, with, among',
      morphology: 'Prep',
    },
    ἀρχῇ: {
      english: ['beginning', 'the beginning'],
      strongs: 'G746',
      lemma: 'ἀρχή',
      definition: 'beginning, origin, first',
      morphology: 'N-DFS',
    },
    ἦν: {
      english: ['was'],
      strongs: 'G1510',
      lemma: 'εἰμί',
      definition: 'to be, exist',
      morphology: 'V-IIA-3S',
    },
    ὁ: {
      english: ['the', 'The'],
      strongs: 'G3588',
      lemma: 'ὁ',
      definition: 'the, this, that',
      morphology: 'T-NSM',
    },
    λόγος: {
      english: ['Word', 'word'],
      strongs: 'G3056',
      lemma: 'λόγος',
      definition: 'word, speech, divine utterance',
      morphology: 'N-NSM',
    },
  };

  useEffect(() => {
    // Fetch scripture data for all three translations
    const loadScripture = async () => {
      setLoading(true);

      try {
        // Fetch all three translations in parallel
        const [originalContent, ultContent, ustContent] = await Promise.all([
          fetchUSFMContent(bookId, 'original', dcsHost),
          fetchUSFMContent(bookId, 'ult', dcsHost),
          fetchUSFMContent(bookId, 'ust', dcsHost),
        ]);

        // Extract verses for the requested chapter from each translation
        const originalVerses = extractVersesFromUSFM(originalContent, chapter);
        const ultVerses = extractVersesFromUSFM(ultContent, chapter);
        const ustVerses = extractVersesFromUSFM(ustContent, chapter);

        setScriptureData({
          original: { [chapter]: originalVerses },
          ult: { [chapter]: ultVerses },
          ust: { [chapter]: ustVerses },
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
      }
    };

    if (bookId && chapter && verse) {
      loadScripture();
    }
  }, [bookId, chapter, verse, dcsHost]);

  // Determine if this is NT or OT using BibleBookData
  const isNT = React.useMemo(() => {
    if (!bookId) return false;
    const bookData = BibleBookData[bookId.toLowerCase()];
    return bookData ? bookData.testament === 'new' : false;
  }, [bookId]);

  // Advanced quote matching function that handles & separators and occurrence
  const findQuoteMatches = (text, quote, targetOccurrence = 1) => {
    if (!quote || !text) return [];

    const words = text.split(/\s+/);
    const normalizedWords = words.map((word) => normalizeHebrewText(word));
    const normalizedQuote = normalizeHebrewText(quote);

    // Split quote by & to get individual parts
    const quoteParts = normalizedQuote.split(' & ').map((part) => part.trim());

    if (quoteParts.length === 1) {
      // Simple case: no & separators, just find occurrences
      return findSimpleMatches(normalizedWords, normalizedQuote, targetOccurrence, words);
    } else {
      // Complex case: & separators require sequential matching
      return findSequentialMatches(normalizedWords, quoteParts, targetOccurrence, words);
    }
  };

  // Find simple matches (no & separators)
  const findSimpleMatches = (normalizedWords, normalizedQuote, targetOccurrence, originalWords) => {
    const matches = [];
    let occurrenceCount = 0;

    // If quote has multiple words, find the sequence
    const quoteWords = normalizedQuote.split(/\s+/);
    if (quoteWords.length > 1) {
      for (let i = 0; i <= normalizedWords.length - quoteWords.length; i++) {
        let match = true;
        for (let j = 0; j < quoteWords.length; j++) {
          if (normalizedWords[i + j] !== quoteWords[j]) {
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
      for (let i = 0; i < normalizedWords.length; i++) {
        if (normalizedWords[i] === normalizedQuote) {
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
  const findSequentialMatches = (normalizedWords, quoteParts, targetOccurrence, originalWords) => {
    console.log('findSequentialMatches called:', { quoteParts, targetOccurrence, textLength: normalizedWords.length });
    const matches = [];
    let globalOccurrenceCount = 0;

    // For & separated quotes, the occurrence applies only to the first part
    const firstPart = quoteParts[0];
    const firstPartWords = firstPart.split(/\s+/);
    console.log('First part analysis:', { firstPart, firstPartWords, firstPartLength: firstPartWords.length });

    // Find the target occurrence of the first part (which may be multiple words)
    for (let i = 0; i <= normalizedWords.length - firstPartWords.length; i++) {
      let match = true;
      for (let j = 0; j < firstPartWords.length; j++) {
        const textWord = normalizedWords[i + j];
        const quoteWord = firstPartWords[j];
        if (textWord !== quoteWord) {
          if (textWord.toLowerCase() === quoteWord.toLowerCase()) {
            console.log(`Case mismatch at position ${i + j}: "${textWord}" vs "${quoteWord}"`);
          }
          match = false;
          break;
        }
      }
      if (match) {
        globalOccurrenceCount++;
        console.log(
          `Found occurrence ${globalOccurrenceCount} of first part at position ${i}:`,
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
          const sequenceMatch = findRemainingParts(normalizedWords, i + firstPartWords.length, remainingParts, originalWords);
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
  const findRemainingParts = (normalizedWords, startIndex, remainingParts, originalWords) => {
    console.log('findRemainingParts called:', { startIndex, remainingParts, availableWords: normalizedWords.slice(startIndex, startIndex + 20) });
    const matches = [];
    let currentWordIndex = startIndex;

    for (let partIndex = 0; partIndex < remainingParts.length; partIndex++) {
      const part = remainingParts[partIndex];
      const partWords = part.split(/\s+/);
      console.log(`Looking for part ${partIndex}: "${part}" (words: ${partWords}) starting from index ${currentWordIndex}`);

      // Find this part, allowing for gaps (0 or more words between parts)
      let found = false;
      for (let j = currentWordIndex; j <= normalizedWords.length - partWords.length; j++) {
        let match = true;
        for (let k = 0; k < partWords.length; k++) {
          const textWord = normalizedWords[j + k];
          const quoteWord = partWords[k];
          if (textWord !== quoteWord) {
            if (textWord.toLowerCase() === quoteWord.toLowerCase()) {
              console.log(`Case mismatch in remaining parts at position ${j + k}: "${textWord}" vs "${quoteWord}"`);
            }
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
      const alignmentKey = Object.keys(mockAlignmentData).find((key) => mockAlignmentData[key].english.some((eng) => eng.toLowerCase() === word.toLowerCase()));

      const alignmentInfo = alignmentKey ? mockAlignmentData[alignmentKey] : null;

      elements.push(
        <AlignedWord
          key={`${word}-${index}`}
          isHighlighted={isHighlighted}
          isAligned={!!alignmentInfo}
          onMouseEnter={(e) => {
            if (alignmentInfo) {
              setHoveredWord(alignmentInfo);
              // Calculate tooltip position once when entering
              const rect = e.target.getBoundingClientRect();
              setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10, // Position above the word
              });
            }
          }}
          onMouseLeave={() => {
            setHoveredWord(null);
          }}
        >
          {word}
          {alignmentInfo && !isOriginal && hoveredWord?.strongs === alignmentInfo.strongs && <StrongNumber>{alignmentInfo.strongs}</StrongNumber>}
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
          text: currentChapter[i],
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
      <ViewerContent>
        <Header>
          <h2 style={{ margin: 0 }}>
            📖 Scripture for {BibleBookData[bookId].title} {chapter}:{verse}
          </h2>
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
        {hoveredWord && (
          <Tooltip
            style={{
              position: 'fixed',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
            }}
          >
            <div>
              <strong>Original:</strong> {hoveredWord.lemma}
            </div>
            <div>
              <strong>Strong's:</strong> {hoveredWord.strongs}
            </div>
            <div>
              <strong>Definition:</strong> {hoveredWord.definition}
            </div>
            <div>
              <strong>Morphology:</strong> {hoveredWord.morphology}
            </div>
          </Tooltip>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading scripture...</p>
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
