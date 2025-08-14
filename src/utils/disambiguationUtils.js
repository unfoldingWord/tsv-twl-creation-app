/**
 * Utilities for handling disambiguation options in TWL entries
 */

/**
 * Parse disambiguation field to extract clickable options
 * Format: "manual:option1 (1:other/time, 2:other/age-timeperiod)"
 */
export const parseDisambiguationOptions = (disambiguationText, onOptionClick) => {
  if (!disambiguationText || typeof disambiguationText !== 'string') {
    return { currentOption: '', clickableOptions: [] };
  }

  // Match pattern like "manual:option1 (1:other/time, 2:other/age-timeperiod)"
  const match = disambiguationText.match(/^manual:option(\d+)\s*\(([^)]+)\)$/);
  if (!match) {
    return { currentOption: disambiguationText, clickableOptions: [] };
  }

  const currentOptionNumber = parseInt(match[1]);
  const optionsText = match[2];

  // Parse individual options like "1:other/time, 2:other/age-timeperiod"
  const optionMatches = optionsText.matchAll(/(\d+):([^,]+)/g);
  const clickableOptions = [];

  for (const optionMatch of optionMatches) {
    const optionNumber = parseInt(optionMatch[1]);
    const twPath = optionMatch[2].trim();

    if (optionNumber !== currentOptionNumber) {
      const newDisambiguation = `manual:option${optionNumber} (${optionsText})`;
      const newTWLink = `rc://*/tw/dict/bible/${twPath}`;

      clickableOptions.push({
        text: `${optionNumber}:${twPath}`,
        newDisambiguation,
        newTWLink,
        onClick: () => onOptionClick(newDisambiguation, newTWLink)
      });
    }
  }

  return {
    currentOption: `manual:option${currentOptionNumber}`,
    clickableOptions
  };
};

/**
 * Render disambiguation text with clickable options
 * Returns an array of text fragments and clickable elements
 */
export const renderDisambiguationText = (disambiguationText, clickableOptions) => {
  if (clickableOptions.length === 0) {
    return [{ type: 'text', content: disambiguationText }];
  }

  // Split the text and identify clickable parts
  const parts = disambiguationText.split('(');
  if (parts.length !== 2) {
    return [{ type: 'text', content: disambiguationText }];
  }

  const prefix = parts[0].trim(); // "manual:option1 "
  const optionsText = parts[1].replace(')', ''); // "1:other/time, 2:other/age-timeperiod"

  const elements = [];
  elements.push({ type: 'text', content: `${prefix} (` });

  optionsText.split(',').forEach((option, optIndex) => {
    const trimmedOption = option.trim();
    const clickableOption = clickableOptions.find(opt => trimmedOption === opt.text);

    if (optIndex > 0) {
      elements.push({ type: 'text', content: ', ' });
    }

    if (clickableOption) {
      elements.push({
        type: 'clickable',
        content: trimmedOption,
        onClick: clickableOption.onClick
      });
    } else {
      elements.push({ type: 'text', content: trimmedOption });
    }
  });

  elements.push({ type: 'text', content: ')' });
  return elements;
};
