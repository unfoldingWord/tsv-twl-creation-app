/**
 * Utilities for handling disambiguation options in TWL entries
 */

/**
 * Parse disambiguation field to extract clickable options
 * New format: "(kt/god, kt/falsegod)"
 * Determines which option is selected based on the current TWLink
 */
export const parseDisambiguationOptions = (disambiguationText, currentTWLink, onOptionClick) => {
  if (!disambiguationText || typeof disambiguationText !== 'string') {
    return { currentOption: '', clickableOptions: [] };
  }

  // Match pattern like "(kt/god, kt/falsegod)" or "(other/time, other/age-timeperiod)"
  const match = disambiguationText.match(/^\(([^)]+)\)$/);
  if (!match) {
    return { currentOption: disambiguationText, clickableOptions: [] };
  }

  const optionsText = match[1];
  const options = optionsText.split(',').map(opt => opt.trim());

  if (options.length < 2) {
    return { currentOption: disambiguationText, clickableOptions: [] };
  }

  // Determine which option is currently selected by examining the TWLink
  let currentOptionIndex = -1; // Default to -1 (no match) instead of 0
  if (currentTWLink) {
    // TWLink format: "rc://*/tw/dict/bible/kt/god"
    const twLinkMatch = currentTWLink.match(/\/([^\/]+\/[^\/]+)$/);
    if (twLinkMatch) {
      const currentPath = twLinkMatch[1]; // e.g., "kt/god"
      const foundIndex = options.findIndex(opt => opt === currentPath);
      if (foundIndex !== -1) {
        currentOptionIndex = foundIndex;
      }
    }
  }

  // Create clickable options
  const clickableOptions = [];
  options.forEach((option, index) => {
    // If no current option is selected (currentOptionIndex === -1), make all options clickable
    // Otherwise, make all non-selected options clickable
    if (currentOptionIndex === -1 || index !== currentOptionIndex) {
      const newTWLink = `rc://*/tw/dict/bible/${option}`;

      clickableOptions.push({
        text: option,
        path: option,
        newDisambiguation: disambiguationText, // Keep same disambiguation text
        newTWLink,
        onClick: () => onOptionClick(disambiguationText, newTWLink)
      });
    }
  });

  return {
    currentOption: currentOptionIndex !== -1 ? options[currentOptionIndex] : '', // Empty string if no match
    clickableOptions,
    allOptions: options,
    selectedIndex: currentOptionIndex
  };
};

/**
 * Render disambiguation text with clickable options
 * New format: Display options on separate lines with commas (no parentheses)
 * Example: "names/judah,\nnames/judea,\nnames/kingdomofjudah"
 * Returns an array of text fragments and clickable elements
 */
export const renderDisambiguationText = (disambiguationText, parseResult) => {
  if (!parseResult || parseResult.clickableOptions.length === 0) {
    return [{ type: 'text', content: disambiguationText }];
  }

  const { allOptions, selectedIndex, clickableOptions } = parseResult;

  // Build the rendered elements without parentheses, with line breaks after commas
  const elements = [];

  allOptions.forEach((option, index) => {
    if (index === selectedIndex) {
      // This is the selected option - render as plain text (bold or different style)
      elements.push({
        type: 'text',
        content: option,
        isSelected: true // Flag to allow custom styling
      });
    } else {
      // This is a clickable option (either selectedIndex is -1 so all are clickable, or this isn't the selected one)
      const clickableOption = clickableOptions.find(opt => opt.path === option);
      if (clickableOption) {
        elements.push({
          type: 'clickable',
          content: option,
          onClick: clickableOption.onClick
        });
      } else {
        elements.push({ type: 'text', content: option });
      }
    }

    // Add comma and line break after each option except the last one
    if (index < allOptions.length - 1) {
      elements.push({ type: 'text', content: ',' });
      elements.push({ type: 'linebreak' });
    }
  });

  return elements;
};
