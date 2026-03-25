/**
 * Applies values to DOM form elements and tracks filled state.
 * Handles all input types and dispatches DOM events for framework compatibility.
 */

import type { FieldElementDescriptor } from '../types/index.js';
import { ElementSelector } from '../utils/ElementSelector.js';
import { logger } from '@/core/Logger.js';
import { buildAttributeSelector } from '../utils/dom-helpers.js';

// Cache native property descriptors at module level to avoid repeated lookups
const NATIVE_INPUT_VALUE_SETTER = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;
const NATIVE_INPUT_CHECKED_SETTER = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'checked'
)?.set;
const NATIVE_TEXTAREA_VALUE_SETTER = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value'
)?.set;
const NATIVE_SELECT_VALUE_SETTER = Object.getOwnPropertyDescriptor(
  HTMLSelectElement.prototype,
  'value'
)?.set;

/**
 * Applies values to DOM form elements with proper event dispatching.
 *
 * @remarks
 * Responsibilities:
 * - Apply values to different element types (input, select, textarea, contenteditable)
 * - Dispatch DOM events (input, change) for framework compatibility (React, Vue, etc.)
 * - Track filled state via data attributes
 * - Clear filled values
 * - Detect user input vs FillKit-filled values
 *
 * @example
 * ```ts
 * const filler = new FieldFiller();
 *
 * // Fill a field
 * const input = document.querySelector('input[type="email"]');
 * filler.fill(input, 'test@example.com');
 *
 * // Check if user modified it
 * const hasUserInput = filler.hasUserInput(input);
 *
 * // Clear the field
 * filler.clear(input);
 * ```
 */
export class FieldFiller {
  /** Batch mode: defer classList operations until finalizeBatch() */
  private batchMode = false;
  /** Elements pending classList.add() in batch mode */
  private pendingClassAdds = new Set<HTMLElement>();
  /**
   * Enables batch mode to defer DOM updates.
   *
   * @remarks
   * Performance optimization: Defer `classList` operations until {@link finalizeBatch} is called.
   * This reduces browser reflows when filling multiple fields at once.
   */
  startBatch(): void {
    this.batchMode = true;
    this.pendingClassAdds.clear();
  }

  /**
   * Finalizes batch mode and applies all pending DOM updates.
   *
   * @remarks
   * Applies all pending `classList` additions in a single operation to minimize reflows.
   */
  finalizeBatch(): void {
    // Apply all pending class additions at once
    for (const element of this.pendingClassAdds) {
      element.classList.add('fillkit-field-filled');
    }

    this.batchMode = false;
    this.pendingClassAdds.clear();
  }

  /**
   * Applies a value to a DOM element.
   *
   * @remarks
   * Handles different element types (input, select, textarea) and dispatches
   * appropriate events (`input`, `change`) to ensure compatibility with frontend frameworks.
   *
   * @param element - The element to fill.
   * @param value - The value to apply.
   * @param source - The source of the data ('cloud' or 'local').
   *
   * @example
   * ```ts
   * filler.fill(emailInput, 'test@example.com', 'cloud');
   * filler.fill(checkbox, true, 'local');
   * filler.fill(select, 'option-value');
   * ```
   */
  fill(
    element: HTMLElement,
    value: string | number | boolean | null,
    source?: 'cloud' | 'local'
  ): void {
    if (value === null) return;

    if (element instanceof HTMLInputElement) {
      this.fillInput(element, value, source);
    } else if (element instanceof HTMLSelectElement) {
      this.fillSelect(element, value, source);
    } else if (element instanceof HTMLTextAreaElement) {
      this.fillTextarea(element, value, source);
    } else if (element.contentEditable === 'true') {
      this.fillContentEditable(element, value, source);
    }
  }

  /**
   * Clears the value from an element.
   *
   * @remarks
   * Resets the element to its empty state and removes FillKit tracking attributes.
   * Dispatches a `change` event.
   *
   * @param element - The element to clear.
   *
   * @example
   * ```ts
   * filler.clear(input);
   * ```
   */
  clear(element: HTMLElement): void {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        if (NATIVE_INPUT_CHECKED_SETTER) {
          NATIVE_INPUT_CHECKED_SETTER.call(element, false);
        } else {
          element.checked = false;
        }
      } else {
        if (NATIVE_INPUT_VALUE_SETTER) {
          NATIVE_INPUT_VALUE_SETTER.call(element, '');
        } else {
          element.value = '';
        }
      }
    } else if (element instanceof HTMLSelectElement) {
      if (NATIVE_SELECT_VALUE_SETTER) {
        const firstOption = element.options[0];
        NATIVE_SELECT_VALUE_SETTER.call(
          element,
          firstOption ? firstOption.value : ''
        );
      } else {
        element.selectedIndex = 0;
      }
    } else if (element instanceof HTMLTextAreaElement) {
      if (NATIVE_TEXTAREA_VALUE_SETTER) {
        NATIVE_TEXTAREA_VALUE_SETTER.call(element, '');
      } else {
        element.value = '';
      }
    } else if (element.contentEditable === 'true') {
      element.textContent = '';
    }

    element.removeAttribute('data-fillkit-filled');
    element.removeAttribute('data-filled-by');
    element.classList.remove('fillkit-field-filled');

    // Dispatch full event sequence for framework compatibility (React, Vue)
    element.dispatchEvent(
      new Event('input', { bubbles: true, composed: true })
    );
    element.dispatchEvent(
      new Event('change', { bubbles: true, composed: true })
    );
  }

  /**
   * Clears all fillable elements within a given scope.
   *
   * @remarks
   * Iterates through all inputs, selects, textareas, and contenteditable elements
   * within the scope and clears them.
   *
   * @param scope - The element or document to search within.
   *
   * @example
   * ```ts
   * filler.clearAll(document); // Clear entire page
   * filler.clearAll(form); // Clear specific form
   * ```
   */
  clearAll(scope: HTMLElement | Document): void {
    const elements = scope.querySelectorAll('input, select, textarea');
    for (const element of elements) {
      this.clear(element as HTMLElement);
    }

    // Also clear contenteditable elements
    const contentEditableElements = scope.querySelectorAll(
      '[contenteditable="true"]'
    );
    for (const element of contentEditableElements) {
      this.clear(element as HTMLElement);
    }
  }

  /**
   * Fills a field using a descriptor, querying for the element first.
   *
   * @remarks
   * Useful when working with serialized descriptors where a direct DOM reference
   * is not available. Attempts to find the element using the descriptor's selector
   * and fallback strategies.
   *
   * @param descriptor - The {@link FieldElementDescriptor} to use for finding the element.
   * @param value - The value to fill.
   * @param source - Optional source indicator ('cloud' or 'local').
   * @returns `true` if the element was found and filled, `false` otherwise.
   *
   * @example
   * ```ts
   * const descriptor: FieldElementDescriptor = {
   *   tagName: 'input',
   *   type: 'email',
   *   name: 'user_email',
   *   selector: '#login-form input[name="user_email"]'
   * };
   *
   * const success = filler.fillFromDescriptor(descriptor, 'test@example.com', 'cloud');
   * ```
   */
  fillFromDescriptor(
    descriptor: FieldElementDescriptor,
    value: string | number | boolean | null,
    source?: 'cloud' | 'local'
  ): boolean {
    // Try primary selector first
    let element = ElementSelector.query(descriptor);

    // If primary selector fails, try fallback strategies
    if (!element) {
      element = ElementSelector.queryWithFallback(descriptor);
    }

    if (!element) {
      logger.warn(
        `FillKit: Element not found for descriptor with selector: ${descriptor.selector}`
      );
      return false;
    }

    // Fill the element using the standard fill method
    this.fill(element, value, source);
    return true;
  }

  /**
   * Checks if a field has been modified by the user since it was filled.
   *
   * @remarks
   * Compares the current value of the element with the value stored in the
   * `data-fillkit-filled` attribute.
   *
   * @param element - The element to check.
   * @returns `true` if the element has content different from what FillKit filled.
   *
   * @example
   * ```ts
   * filler.fill(input, 'test@example.com');
   * console.log(filler.hasUserInput(input)); // false
   *
   * // User changes the value
   * input.value = 'user@example.com';
   * console.log(filler.hasUserInput(input)); // true
   * ```
   */
  hasUserInput(element: HTMLElement): boolean {
    // Get the value that FillKit last filled (if any)
    const fillkitValue = element.getAttribute('data-fillkit-filled');

    // If FillKit hasn't filled this field, check if it has any value
    if (fillkitValue === null) {
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          return element.checked;
        }
        return element.value !== '';
      }

      if (element instanceof HTMLSelectElement) {
        return element.selectedIndex > 0;
      }

      if (element instanceof HTMLTextAreaElement) {
        return element.value !== '';
      }

      if (element.contentEditable === 'true') {
        return element.textContent !== '';
      }

      return false;
    }

    // FillKit has filled this field - check if user modified it
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        // Compare current checked state with FillKit's filled value
        const fillkitChecked = fillkitValue === 'true';
        return element.checked !== fillkitChecked;
      }
      // For other input types, compare current value with FillKit's filled value
      return element.value !== fillkitValue;
    }

    if (element instanceof HTMLSelectElement) {
      // Compare current selected index with FillKit's filled index
      return String(element.selectedIndex) !== fillkitValue;
    }

    if (element instanceof HTMLTextAreaElement) {
      // Compare current value with FillKit's filled value
      return element.value !== fillkitValue;
    }

    if (element.contentEditable === 'true') {
      // Compare current text content with FillKit's filled value
      return element.textContent !== fillkitValue;
    }

    return false;
  }

  /**
   * Retrieves the value that FillKit previously filled into the element.
   *
   * @param element - The element to check.
   * @returns The filled value as a string, or `null` if not filled by FillKit.
   */
  getFilledValue(element: HTMLElement): string | null {
    return element.getAttribute('data-fillkit-filled');
  }

  /**
   * Checks if an element is currently marked as filled by FillKit.
   *
   * @param element - The element to check.
   * @returns `true` if the element has the FillKit tracking attribute.
   */
  isFilled(element: HTMLElement): boolean {
    return element.hasAttribute('data-fillkit-filled');
  }

  /**
   * Internal method to fill an `<input>` element.
   *
   * @remarks
   * Handles checkboxes, radios, and standard inputs. Uses native property setters
   * where possible to bypass framework overrides (e.g., React).
   *
   * @param input - The input element to fill.
   * @param value - The value to apply.
   * @param source - The source of the data.
   */
  private fillInput(
    input: HTMLInputElement,
    value: string | number | boolean,
    source?: 'cloud' | 'local'
  ): void {
    if (input.type === 'checkbox' || input.type === 'radio') {
      // For React compatibility: use native setter for checked property
      if (NATIVE_INPUT_CHECKED_SETTER) {
        NATIVE_INPUT_CHECKED_SETTER.call(input, Boolean(value));
      } else {
        input.checked = Boolean(value);
      }

      // Store the FillKit-filled value for tracking
      input.setAttribute('data-fillkit-filled', String(value));
      if (source) {
        input.setAttribute('data-filled-by', source);
      }

      // For radio buttons, ensure only one in the group is selected
      if (input.type === 'radio' && input.checked) {
        const name = input.name;
        if (name) {
          const radios = document.querySelectorAll(
            `input[type="radio"]${buildAttributeSelector('name', name)}`
          );
          radios.forEach(radio => {
            if (radio !== input) {
              const checkedRadio = radio as HTMLInputElement;
              if (NATIVE_INPUT_CHECKED_SETTER) {
                NATIVE_INPUT_CHECKED_SETTER.call(checkedRadio, false);
              } else {
                checkedRadio.checked = false;
              }
              // Mark unchecked radios as FillKit-filled too
              radio.setAttribute('data-fillkit-filled', 'false');
              if (source) {
                radio.setAttribute('data-filled-by', source);
              }
            }
          });
        }
      }
    } else if (input.type === 'number' || input.type === 'range') {
      // For React compatibility: use native setter for value property
      if (NATIVE_INPUT_VALUE_SETTER) {
        NATIVE_INPUT_VALUE_SETTER.call(input, String(value));
      } else {
        input.value = String(value);
      }

      // Store the FillKit-filled value for tracking
      input.setAttribute('data-fillkit-filled', String(value));
      if (source) {
        input.setAttribute('data-filled-by', source);
      }
    } else {
      // For React compatibility: use native setter before setting value
      if (NATIVE_INPUT_VALUE_SETTER) {
        NATIVE_INPUT_VALUE_SETTER.call(input, String(value));
      } else {
        input.value = String(value);
      }

      // Store the FillKit-filled value for tracking
      input.setAttribute('data-fillkit-filled', String(value));
      if (source) {
        input.setAttribute('data-filled-by', source);
      }
    }

    // Add filled class for styling (deferred in batch mode)
    if (this.batchMode) {
      this.pendingClassAdds.add(input);
    } else {
      input.classList.add('fillkit-field-filled');
    }

    // Dispatch events for framework compatibility (React, Vue, Angular)
    // Full focus/blur sequence ensures form libraries track dirty/touched state
    input.dispatchEvent(new Event('focus', { bubbles: false, composed: true }));
    input.dispatchEvent(
      new Event('focusin', { bubbles: true, composed: true })
    );
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: String(value),
      })
    );
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('blur', { bubbles: false, composed: true }));
    input.dispatchEvent(
      new Event('focusout', { bubbles: true, composed: true })
    );
  }

  /**
   * Internal method to fill a `<select>` element.
   *
   * @remarks
   * Attempts to find an option matching the value. If not found, falls back to
   * selecting a random valid option.
   *
   * @param select - The select element to fill.
   * @param value - The value to apply.
   * @param source - The source of the data.
   */
  private fillSelect(
    select: HTMLSelectElement,
    value: string | number | boolean,
    source?: 'cloud' | 'local'
  ): void {
    // For select elements, try to select the option matching the generated value
    if (select.options.length > 0) {
      const valueToSelect = String(value);

      // Try to find option with matching value
      let optionToSelect: HTMLOptionElement | null = null;
      for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        if (option.value === valueToSelect) {
          optionToSelect = option;
          break;
        }
      }

      // Fallback: if no match found, select a random valid option
      if (!optionToSelect) {
        const startIndex = select.options[0].value === '' ? 1 : 0;
        if (startIndex < select.options.length) {
          const validOptions = Array.from(select.options).slice(startIndex);
          if (validOptions.length > 0) {
            optionToSelect =
              validOptions[Math.floor(Math.random() * validOptions.length)];
          }
        }
      }

      // Select the option if found
      if (optionToSelect) {
        // For React compatibility: use native setter for value property
        if (NATIVE_SELECT_VALUE_SETTER) {
          NATIVE_SELECT_VALUE_SETTER.call(select, optionToSelect.value);
        } else {
          optionToSelect.selected = true;
        }

        // Store the selected index for tracking
        select.setAttribute(
          'data-fillkit-filled',
          String(select.selectedIndex)
        );
        if (source) {
          select.setAttribute('data-filled-by', source);
        }
      }
    }

    // Add filled class for styling (deferred in batch mode)
    if (this.batchMode) {
      this.pendingClassAdds.add(select);
    } else {
      select.classList.add('fillkit-field-filled');
    }

    // Dispatch events for framework compatibility
    select.dispatchEvent(
      new Event('focus', { bubbles: false, composed: true })
    );
    select.dispatchEvent(
      new Event('focusin', { bubbles: true, composed: true })
    );
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    select.dispatchEvent(
      new Event('change', { bubbles: true, composed: true })
    );
    select.dispatchEvent(new Event('blur', { bubbles: false, composed: true }));
    select.dispatchEvent(
      new Event('focusout', { bubbles: true, composed: true })
    );
  }

  /**
   * Internal method to fill a `<textarea>` element.
   *
   * @param textarea - The textarea element to fill.
   * @param value - The value to apply.
   * @param source - The source of the data.
   */
  private fillTextarea(
    textarea: HTMLTextAreaElement,
    value: string | number | boolean,
    source?: 'cloud' | 'local'
  ): void {
    // For React compatibility: use native setter for value property
    if (NATIVE_TEXTAREA_VALUE_SETTER) {
      NATIVE_TEXTAREA_VALUE_SETTER.call(textarea, String(value));
    } else {
      textarea.value = String(value);
    }

    // Store the FillKit-filled value for tracking
    textarea.setAttribute('data-fillkit-filled', String(value));
    if (source) {
      textarea.setAttribute('data-filled-by', source);
    }

    // Add filled class for styling (deferred in batch mode)
    if (this.batchMode) {
      this.pendingClassAdds.add(textarea);
    } else {
      textarea.classList.add('fillkit-field-filled');
    }

    // Dispatch events for framework compatibility
    textarea.dispatchEvent(
      new Event('focus', { bubbles: false, composed: true })
    );
    textarea.dispatchEvent(
      new Event('focusin', { bubbles: true, composed: true })
    );
    textarea.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: String(value),
      })
    );
    textarea.dispatchEvent(
      new Event('change', { bubbles: true, composed: true })
    );
    textarea.dispatchEvent(
      new Event('blur', { bubbles: false, composed: true })
    );
    textarea.dispatchEvent(
      new Event('focusout', { bubbles: true, composed: true })
    );
  }

  /**
   * Internal method to fill a contenteditable element.
   *
   * @param element - The contenteditable element to fill.
   * @param value - The value to apply.
   * @param source - The source of the data.
   */
  private fillContentEditable(
    element: HTMLElement,
    value: string | number | boolean,
    source?: 'cloud' | 'local'
  ): void {
    element.textContent = String(value);
    // Store the FillKit-filled value for tracking
    element.setAttribute('data-fillkit-filled', String(value));
    if (source) {
      element.setAttribute('data-filled-by', source);
    }

    // Add filled class for styling (deferred in batch mode)
    if (this.batchMode) {
      this.pendingClassAdds.add(element);
    } else {
      element.classList.add('fillkit-field-filled');
    }

    // Dispatch events for framework compatibility
    element.dispatchEvent(
      new Event('focus', { bubbles: false, composed: true })
    );
    element.dispatchEvent(
      new Event('focusin', { bubbles: true, composed: true })
    );
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: String(value),
      })
    );
    element.dispatchEvent(
      new Event('change', { bubbles: true, composed: true })
    );
    element.dispatchEvent(
      new Event('blur', { bubbles: false, composed: true })
    );
    element.dispatchEvent(
      new Event('focusout', { bubbles: true, composed: true })
    );
  }
}
