/**
 * Shared form building utilities for OptionsSheet components.
 *
 * @remarks
 * This module provides a collection of helper functions to create consistent
 * UI elements such as sections, spacers, inputs, selects, checkboxes, and textareas.
 * It also includes utility functions for validating and parsing CSS selectors.
 */

/**
 * Creates a vertical spacer element to separate sections.
 *
 * @returns An HTMLElement representing the spacer.
 */
export function createSectionSpacer(): HTMLElement {
  const spacer = document.createElement('div');
  spacer.className = 'fillkit-section-spacer';
  return spacer;
}

/**
 * Creates a titled section group container.
 *
 * @param title - The title of the section group.
 * @returns The content container element where child elements should be appended.
 */
export function createSectionGroup(title: string): HTMLElement {
  const group = document.createElement('div');
  group.className = 'fillkit-options-group';

  const groupTitle = document.createElement('h3');
  groupTitle.className = 'fillkit-options-group-title';
  groupTitle.textContent = title;

  const groupContent = document.createElement('div');
  groupContent.className = 'fillkit-options-group-content';

  group.appendChild(groupTitle);
  group.appendChild(groupContent);

  return groupContent;
}

/**
 * Creates a standard form field (input or select) with a label.
 *
 * @param label - The text label for the field.
 * @param type - The input type (e.g., 'text', 'password', 'select').
 * @param name - The name attribute for the input element.
 * @param options - Array of options for select inputs (optional).
 * @param currentValue - The current value of the field.
 * @param placeholder - Placeholder text for the input (optional).
 * @param onChange - Callback function triggered when the value changes.
 * @returns The HTMLElement containing the form field.
 */
export function createFormSection(
  label: string,
  type: string,
  name: string,
  options?: Array<{ value: string; label: string; disabled?: boolean }>,
  currentValue?: string | boolean,
  placeholder?: string,
  onChange?: (value: string) => void
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'fillkit-options-section';

  const labelEl = document.createElement('label');
  labelEl.className = 'fillkit-options-label';
  labelEl.textContent = label;

  let input: HTMLElement;

  if (type === 'select' && options) {
    const select = document.createElement('select');
    select.className = 'fillkit-options-select';
    select.name = name;

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.disabled) option.disabled = true;
      if (opt.value === currentValue) option.selected = true;
      select.appendChild(option);
    });

    if (onChange) {
      select.addEventListener('change', () => {
        onChange(select.value);
      });
    }

    input = select;
  } else {
    const textInput = document.createElement('input');
    textInput.type = type;
    textInput.className = 'fillkit-options-input';
    textInput.name = name;
    if (placeholder) textInput.placeholder = placeholder;
    if (currentValue !== undefined && currentValue !== null) {
      textInput.value = String(currentValue);
    }

    if (onChange) {
      textInput.addEventListener('change', () => {
        onChange(textInput.value);
      });
    }

    input = textInput;
  }

  section.appendChild(labelEl);
  section.appendChild(input);

  return section;
}

/**
 * Creates a checkbox field with a label and description.
 *
 * @param label - The main label for the checkbox.
 * @param name - The name attribute for the checkbox input.
 * @param description - A secondary description text displayed below the label.
 * @param currentValue - The current checked state of the checkbox.
 * @param onChange - Callback function triggered when the checkbox state changes.
 * @returns The HTMLElement containing the checkbox section.
 */
export function createCheckboxSection(
  label: string,
  name: string,
  description: string,
  currentValue?: boolean,
  onChange?: (value: boolean) => void
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'fillkit-options-section';

  const wrapper = document.createElement('label');
  wrapper.className = 'fillkit-options-checkbox-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = name;
  checkbox.checked = currentValue || false;

  if (onChange) {
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });
  }

  const labelContainer = document.createElement('div');
  labelContainer.className = 'fillkit-options-checkbox-label';
  const labelText = document.createElement('div');
  labelText.textContent = label;
  const descText = document.createElement('div');
  descText.className = 'fillkit-options-checkbox-desc';
  descText.textContent = description;
  labelContainer.appendChild(labelText);
  labelContainer.appendChild(descText);

  wrapper.appendChild(checkbox);
  wrapper.appendChild(labelContainer);
  section.appendChild(wrapper);

  return section;
}

/**
 * Validates whether a string is a valid CSS selector.
 *
 * @remarks
 * Uses `document.querySelector` to test validity. Empty strings are considered valid.
 *
 * @param selector - The CSS selector string to validate.
 * @returns `true` if the selector is valid or empty, `false` otherwise.
 */
export function validateCSSSelector(selector: string): boolean {
  if (!selector || selector.trim().length === 0) {
    return true; // Empty is valid (will be filtered out)
  }
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses a string containing multiple selectors into an array.
 *
 * @remarks
 * Supports separation by newlines or commas. Trims whitespace and filters out empty strings.
 *
 * @param input - The raw input string containing selectors.
 * @returns An array of cleaned, non-empty selector strings.
 */
export function parseSelectors(input: string): string[] {
  if (!input || input.trim().length === 0) {
    return [];
  }

  // Split by newline or comma, trim whitespace, filter empty
  return input
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Creates a textarea field with a label, description, and error display.
 *
 * @param label - The label for the textarea.
 * @param name - The name attribute for the textarea.
 * @param description - Helper text displayed below the textarea.
 * @param currentValue - The initial text content.
 * @param placeholder - Placeholder text.
 * @param onChange - Callback function triggered on input.
 * @returns An object containing the section element and the error element.
 */
export function createTextareaSection(
  label: string,
  name: string,
  description: string,
  currentValue?: string,
  placeholder?: string,
  onChange?: (value: string) => void
): { section: HTMLElement; errorEl: HTMLElement } {
  const section = document.createElement('div');
  section.className = 'fillkit-options-section';

  const labelEl = document.createElement('label');
  labelEl.className = 'fillkit-options-label';
  labelEl.textContent = label;

  const textarea = document.createElement('textarea');
  textarea.className = 'fillkit-options-textarea';
  textarea.name = name;
  textarea.rows = 3;
  if (placeholder) textarea.placeholder = placeholder;
  if (currentValue) textarea.value = currentValue;

  const desc = document.createElement('div');
  desc.className = 'fillkit-options-field-desc';
  desc.textContent = description;

  // Error message container (hidden by default — styled via CSS class)
  const errorEl = document.createElement('div');
  errorEl.className = 'fillkit-options-error';

  if (onChange) {
    textarea.addEventListener('input', () => {
      onChange(textarea.value);
    });
  }

  section.appendChild(labelEl);
  section.appendChild(textarea);
  section.appendChild(desc);
  section.appendChild(errorEl);

  return { section, errorEl };
}
