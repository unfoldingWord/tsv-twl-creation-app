import usfmjs from 'usfm-js';

/**
 * Extract morphological data from USFM word objects
 * @param {Object} wordObject - USFM word object
 * @return {Object} morphological data
 */
function extractWordMorphology(wordObject) {
  console.log('extractWordMorphology called with wordObject:', wordObject);
  console.log('wordObject keys:', Object.keys(wordObject));

  // Handle both direct properties, x- prefixed properties, and attributes object
  const strong = (wordObject.attributes && (wordObject.attributes.strong || wordObject.attributes['x-strong'])) || wordObject.strong || wordObject['x-strong'];
  const lemma = (wordObject.attributes && (wordObject.attributes.lemma || wordObject.attributes['x-lemma'])) || wordObject.lemma || wordObject['x-lemma'];
  const morph = (wordObject.attributes && (wordObject.attributes.morph || wordObject.attributes['x-morph'])) || wordObject.morph || wordObject['x-morph'];

  if (!strong && !lemma) {
    console.log('No strong or lemma attribute found');
    return null;
  }

  console.log('Extracted values - strong:', strong, 'lemma:', lemma, 'morph:', morph);

  const morphology = {
    strongs: strong,
    lemma,
    morphology: morph
  };
  console.log('Returning morphology:', morphology);
  return morphology;
}

/**
 * dive down into milestone to extract words and text
 * @param {Object} verseObject - milestone to parse
 * @return {string} text content of milestone
 */
const parseMilestone = verseObject => {
  let text = verseObject.text || '';
  let wordSpacing = '';
  const length = verseObject.children ? verseObject.children.length : 0;

  for (let i = 0; i < length; i++) {
    let child = verseObject.children[i];

    switch (child.type) {
      case 'word':
        text += wordSpacing + child.text;
        wordSpacing = ' ';
        break;

      case 'milestone':
        text += wordSpacing + parseMilestone(child);
        wordSpacing = ' ';
        break;

      default:
        if (child.text) {
          text += child.text;
          const lastChar = text.substr(-1);

          if ((lastChar !== ',') && (lastChar !== '.') && (lastChar !== '?') && (lastChar !== ';')) { // legacy support, make sure padding before word
            wordSpacing = '';
          }
        }
        break;
    }
  }
  return text;
};

/**
 * get text from word and milestone markers
 * @param {Object} verseObject - to parse
 * @param {String} wordSpacing - spacing to use before next word
 * @return {*} new verseObject and word spacing
 */
const replaceWordsAndMilestones = (verseObject, wordSpacing) => {
  let text = '';

  if (verseObject.type === 'word') {
    text = wordSpacing + verseObject.text;
  } else if (verseObject.type === 'milestone') {
    text = wordSpacing + parseMilestone(verseObject);
  }

  if (text) { // replace with text object
    verseObject = {
      type: 'text',
      text,
    };
    wordSpacing = ' ';
  } else {
    wordSpacing = ' ';

    if (verseObject.nextChar) {
      wordSpacing = ''; // no need for spacing before next word if this item has it
    } else if (verseObject.text) {
      const lastChar = verseObject.text.substr(-1);

      if (![',', '.', '?', ';'].includes(lastChar)) { // legacy support, make sure padding before next word if punctuation
        wordSpacing = '';
      }
    }

    if (verseObject.children) { // handle nested
      const verseObject_ = cloneDeep(verseObject);
      let wordSpacing_ = '';
      const length = verseObject.children.length;

      for (let i = 0; i < length; i++) {
        const flattened =
          replaceWordsAndMilestones(verseObject.children[i], wordSpacing_);
        wordSpacing_ = flattened.wordSpacing;
        verseObject_.children[i] = flattened.verseObject;
      }
      verseObject = verseObject_;
    }
  }
  return { verseObject, wordSpacing };
};

/**
 * converts verse from verse objects to USFM string
 * @param verseData
 * @return {string}
 */
function convertVerseDataToUSFM(verseData) {
  const outputData = {
    'chapters': {},
    'headers': [],
    'verses': { '1': verseData },
  };
  const USFM = usfmjs.toUSFM(outputData, { chunk: true, forcedNewLines: true });
  const split = USFM.split('\\v 1');

  if (split.length > 1) {
    let content = split[1];

    if (content.substr(0, 1) === ' ') { // remove space separator
      content = content.substr(1);
    }
    return content;
  }
  return ''; // error on JSON to USFM
}

/**
 * @description remove milestones and word markers
 * @param {Object|Array} verseData
 * @return {Object}
 */
function removeMilestonesAndWordMarkers(verseData) {
  const verseObjects = verseData?.verseObjects || verseData;
  if (verseObjects) {
    let wordSpacing = '';
    const flattenedData = [];
    const length = verseObjects.length;

    for (let i = 0; i < length; i++) {
      const verseObject = verseObjects[i];
      const flattened = replaceWordsAndMilestones(verseObject, wordSpacing);
      wordSpacing = flattened.wordSpacing;
      flattenedData.push(flattened.verseObject);
    }
    verseData = { // use flattened data
      verseObjects: flattenedData,
    };
  }
  return verseData;
}

/**
 * @description convert verse from verse objects to USFM string, removing milestones and word markers
 * @param {Object|Array} verseData
 * @return {String}
 */
const getUsfmForVerseContent = (verseData) => {
  verseData = removeMilestonesAndWordMarkers(verseData);
  return convertVerseDataToUSFM(verseData);
};

const flattenChapterData = (chapterData) => {
  let usfmStr = '';

  if ("front" in chapterData) {
    usfmStr += getUsfmForVerseContent(chapterData["front"]);
  }
  Object.keys(chapterData).forEach((verseNum) => {
    if (verseNum === "front") {
      return;
    }
    const verseData = chapterData[verseNum];
    usfmStr += `\\v ${verseNum} ` + getUsfmForVerseContent(verseData);
  });

  return usfmStr;
}

export const removeAlignments = (usfmContent) => {
  try {
    const usfmJSON = usfmjs.toJSON(usfmContent);
    let usfmStr = '';

    usfmJSON.headers.forEach(header => {
      if (header.type == "text") {
        usfmStr += `${header.text}\n`;
      } else if (header.tag && header.content) {
        if (header.content !== "\\*") {
          header.content = ` ${header.content}`;
        }
        usfmStr += `\\${header.tag}${header.content}\n`;
      }
    })

    if ("front" in usfmJSON.chapters) {
      usfmStr += flattenChapterData(usfmJSON.chapters["front"]);
    }
    Object.keys(usfmJSON.chapters).forEach(chapterNum => {
      if (chapterNum === "front") {
        return;
      }
      usfmStr += `\n\\c ${chapterNum}\n` + flattenChapterData(usfmJSON.chapters[chapterNum]);
    });

    return usfmStr;
  } catch (error) {
    console.error('Error in removeAlignments:', error);
    // Fallback: return the original content if processing fails
    return usfmContent;
  }
}

/**
 * Extract verses from USFM content for a specific chapter or all chapters
 * Enhanced to also extract lexicon data for tooltips
 * @param {string} usfmContent - The USFM content to parse
 * @param {number} [chapterNum] - Optional chapter number to extract (if not provided, extracts all chapters)
 * @return {Object} Object with chapter numbers as keys, each containing verse objects with text and lexicon data
 */
export const extractVersesFromUSFM = (usfmContent, chapterNum) => {
  try {
    const usfmJSON = usfmjs.toJSON(usfmContent);
    console.log('USFM JSON structure sample:', JSON.stringify(usfmJSON.chapters?.['1']?.['1']?.verseObjects?.slice(0, 3), null, 2));
    console.log('Full USFM content sample:', usfmContent.substring(0, 500));
    const allChapters = {};

    if (usfmJSON.chapters) {
      // If specific chapter requested, only process that one
      if (chapterNum !== undefined && usfmJSON.chapters[chapterNum]) {
        const chapterData = usfmJSON.chapters[chapterNum];
        const verses = {};

        // Extract verses from the specific chapter
        Object.keys(chapterData).forEach(verseNum => {
          if (verseNum !== 'front') {
            const verseData = chapterData[verseNum];
            if (verseData && verseData.verseObjects) {
              // Extract text and lexicon data from verse objects
              let verseText = '';
              const lexiconData = [];

              verseData.verseObjects.forEach(obj => {
                if (obj.type === 'text' && !obj.tag) {
                  verseText += obj.text + ' ';
                } else if (obj.type === 'word' || (obj.type === 'text' && obj.tag === 'w')) {
                  verseText += obj.text + ' ';
                  // Extract lexicon data from word object
                  console.log('Processing Greek word object:', obj);
                  const wordLexicon = extractWordMorphology(obj);
                  console.log('Extracted lexicon for Greek word:', wordLexicon);
                  if (wordLexicon.strongs || wordLexicon.lemma) {
                    lexiconData.push({
                      word: obj.text,
                      ...wordLexicon
                    });
                  }
                } else if (obj.type === 'milestone') {
                  verseText += parseMilestone(obj) + ' ';
                  // Extract lexicon data from milestone attributes and associate with children
                  if (obj.children) {
                    obj.children.forEach(child => {
                      if (child.type === 'word') {
                        // Create lexicon entry using milestone attributes (handle both direct and x- prefixed)
                        const milestoneLexicon = {
                          word: child.text,
                          strongs: (obj.attributes && (obj.attributes.strong || obj.attributes['x-strong'])) || obj.strong || obj['x-strong'] || '',
                          lemma: (obj.attributes && (obj.attributes.lemma || obj.attributes['x-lemma'])) || obj.lemma || obj['x-lemma'] || '',
                          morphology: (obj.attributes && (obj.attributes.morph || obj.attributes['x-morph'])) || obj.morph || obj['x-morph'] || '',
                          gloss: (obj.attributes && (obj.attributes.gloss || obj.attributes['x-gloss'])) || obj.gloss || obj['x-gloss'] || ''
                        };
                        if (milestoneLexicon.strongs || milestoneLexicon.lemma) {
                          lexiconData.push(milestoneLexicon);
                        }
                      }
                    });
                  }
                } else if (obj.children) {
                  // Handle nested objects recursively
                  obj.children.forEach(child => {
                    if (child.text) {
                      verseText += child.text + ' ';
                    } else if (child.type === 'word') {
                      verseText += child.text + ' ';
                      console.log('Processing nested Greek word object:', child);
                      const wordLexicon = extractWordMorphology(child);
                      console.log('Extracted lexicon for nested Greek word:', wordLexicon);
                      if (wordLexicon.strongs || wordLexicon.lemma) {
                        lexiconData.push({
                          word: child.text,
                          ...wordLexicon
                        });
                      }
                    } else if (child.type === 'milestone') {
                      verseText += parseMilestone(child) + ' ';
                      // Extract lexicon data from nested milestone attributes and associate with children
                      if (child.children) {
                        child.children.forEach(grandChild => {
                          if (grandChild.type === 'word') {
                            // Create lexicon entry using nested milestone attributes (handle both direct and x- prefixed)
                            const nestedMilestoneLexicon = {
                              word: grandChild.text,
                              strongs: (child.attributes && (child.attributes.strong || child.attributes['x-strong'])) || child.strong || child['x-strong'] || '',
                              lemma: (child.attributes && (child.attributes.lemma || child.attributes['x-lemma'])) || child.lemma || child['x-lemma'] || '',
                              morphology: (child.attributes && (child.attributes.morph || child.attributes['x-morph'])) || child.morph || child['x-morph'] || '',
                              gloss: (child.attributes && (child.attributes.gloss || child.attributes['x-gloss'])) || child.gloss || child['x-gloss'] || ''
                            };
                            if (nestedMilestoneLexicon.strongs || nestedMilestoneLexicon.lemma) {
                              lexiconData.push(nestedMilestoneLexicon);
                            }
                          }
                        });
                      }
                    }
                  });
                }
              });

              verses[parseInt(verseNum)] = {
                text: verseText.trim(),
                lexicon: lexiconData
              };
            }
          }
        });

        return { [chapterNum]: verses };
      }

      // If no specific chapter requested, extract all chapters
      Object.keys(usfmJSON.chapters).forEach(chapterKey => {
        const chapterData = usfmJSON.chapters[chapterKey];
        const verses = {};

        // Extract verses from this chapter
        Object.keys(chapterData).forEach(verseNum => {
          if (verseNum !== 'front') {
            const verseData = chapterData[verseNum];
            if (verseData && verseData.verseObjects) {
              // Extract text and lexicon data from verse objects
              let verseText = '';
              const lexiconData = [];

              verseData.verseObjects.forEach(obj => {
                if (obj.type === 'text' && !obj.tag) {
                  verseText += obj.text + ' ';
                } else if (obj.type === 'word' || (obj.type === 'text' && obj.tag === 'w')) {
                  verseText += obj.text + ' ';
                  // Extract lexicon data from word object
                  console.log('Processing Greek word object:', obj);
                  const wordLexicon = extractWordMorphology(obj);
                  console.log('Extracted lexicon for Greek word:', wordLexicon);
                  if (wordLexicon.strongs || wordLexicon.lemma) {
                    lexiconData.push({
                      word: obj.text,
                      ...wordLexicon
                    });
                  }
                } else if (obj.type === 'milestone') {
                  verseText += parseMilestone(obj) + ' ';
                  // Extract lexicon data from milestone attributes and associate with children
                  if (obj.children) {
                    obj.children.forEach(child => {
                      if (child.type === 'word') {
                        // Create lexicon entry using milestone attributes (handle both direct and x- prefixed)
                        const milestoneLexicon = {
                          word: child.text,
                          strongs: obj.strong || obj['x-strong'] || '',
                          lemma: obj.lemma || obj['x-lemma'] || '',
                          morphology: obj.morph || obj['x-morph'] || '',
                          gloss: obj.gloss || obj['x-gloss'] || ''
                        };
                        if (milestoneLexicon.strongs || milestoneLexicon.lemma) {
                          lexiconData.push(milestoneLexicon);
                        }
                      }
                    });
                  }
                } else if (obj.children) {
                  // Handle nested objects recursively
                  obj.children.forEach(child => {
                    if (child.text) {
                      verseText += child.text + ' ';
                    } else if (child.type === 'word') {
                      verseText += child.text + ' ';
                      console.log('Processing nested Greek word object:', child);
                      const wordLexicon = extractWordMorphology(child);
                      console.log('Extracted lexicon for nested Greek word:', wordLexicon);
                      if (wordLexicon.strongs || wordLexicon.lemma) {
                        lexiconData.push({
                          word: child.text,
                          ...wordLexicon
                        });
                      }
                    } else if (child.type === 'milestone') {
                      verseText += parseMilestone(child) + ' ';
                      // Extract lexicon data from nested milestone attributes and associate with children
                      if (child.children) {
                        child.children.forEach(grandChild => {
                          if (grandChild.type === 'word') {
                            // Create lexicon entry using nested milestone attributes (handle both direct and x- prefixed)
                            const nestedMilestoneLexicon = {
                              word: grandChild.text,
                              strongs: child.strong || child['x-strong'] || '',
                              lemma: child.lemma || child['x-lemma'] || '',
                              morphology: child.morph || child['x-morph'] || '',
                              gloss: child.gloss || child['x-gloss'] || ''
                            };
                            if (nestedMilestoneLexicon.strongs || nestedMilestoneLexicon.lemma) {
                              lexiconData.push(nestedMilestoneLexicon);
                            }
                          }
                        });
                      }
                    }
                  });
                }
              });

              verses[parseInt(verseNum)] = {
                text: verseText.trim(),
                lexicon: lexiconData
              };
            }
          }
        });

        if (Object.keys(verses).length > 0) {
          allChapters[parseInt(chapterKey)] = verses;
        }
      });
    }

    return allChapters;
  } catch (error) {
    console.error('Error extracting verses from USFM:', error);
    return {};
  }
};/**
 * Extract verses with morphological data from USFM content
 * @param {string} usfmContent - The USFM content to parse
 * @param {string} chapterNum - The chapter number to extract
 * @return {Object} Object with verse numbers as keys and verse data as values
 */
export const extractVersesWithMorphology = (usfmContent, chapterNum) => {
  try {
    const usfmJSON = usfmjs.toJSON(usfmContent);
    const verses = {};

    if (usfmJSON.chapters && usfmJSON.chapters[chapterNum]) {
      const chapterData = usfmJSON.chapters[chapterNum];

      // Extract verses from the chapter
      Object.keys(chapterData).forEach(verseNum => {
        if (verseNum !== 'front') {
          const verseData = chapterData[verseNum];
          if (verseData && verseData.verseObjects) {
            // Extract text and morphological data from verse objects
            let verseText = '';
            const wordMorphology = [];

            verseData.verseObjects.forEach(obj => {
              if (obj.text) {
                verseText += obj.text + ' ';
              } else if (obj.type === 'word' || (obj.type === 'text' && obj.tag === 'w')) {
                verseText += obj.text + ' ';
                wordMorphology.push(extractWordMorphology(obj));
              } else if (obj.type === 'milestone') {
                const milestoneText = parseMilestone(obj);
                verseText += milestoneText + ' ';
                // Extract morphological data from milestone children
                if (obj.children) {
                  obj.children.forEach(child => {
                    if (child.type === 'word') {
                      wordMorphology.push(extractWordMorphology(child));
                    }
                  });
                }
              } else if (obj.children) {
                // Handle nested objects recursively
                obj.children.forEach(child => {
                  if (child.text) {
                    verseText += child.text + ' ';
                  } else if (child.type === 'word') {
                    verseText += child.text + ' ';
                    wordMorphology.push(extractWordMorphology(child));
                  } else if (child.type === 'milestone') {
                    const milestoneText = parseMilestone(child);
                    verseText += milestoneText + ' ';
                    // Extract morphological data from milestone children
                    if (child.children) {
                      child.children.forEach(grandChild => {
                        if (grandChild.type === 'word') {
                          wordMorphology.push(extractWordMorphology(grandChild));
                        }
                      });
                    }
                  }
                });
              }
            });

            verses[parseInt(verseNum)] = {
              text: verseText.trim(),
              morphology: wordMorphology
            };
          }
        }
      });
    }

    return verses;
  } catch (error) {
    console.error('Error extracting verses with morphology:', error);
    return {};
  }
};