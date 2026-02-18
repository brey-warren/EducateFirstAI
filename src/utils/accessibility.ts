/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

// Color contrast utilities
export const ColorContrast = {
  /**
   * Calculate relative luminance of a color
   * Based on WCAG 2.1 formula: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
   */
  getLuminance(hex: string): number {
    // Remove # if present
    const color = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16) / 255;
    const g = parseInt(color.substr(2, 2), 16) / 255;
    const b = parseInt(color.substr(4, 2), 16) / 255;
    
    // Apply gamma correction
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    // Calculate luminance
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if color combination meets WCAG AA standards (4.5:1)
   */
  meetsWCAGAA(foreground: string, background: string): boolean {
    return this.getContrastRatio(foreground, background) >= 4.5;
  },

  /**
   * Check if color combination meets WCAG AAA standards (7:1)
   */
  meetsWCAGAAA(foreground: string, background: string): boolean {
    return this.getContrastRatio(foreground, background) >= 7;
  }
};

// Keyboard navigation utilities
export const KeyboardNavigation = {
  /**
   * Trap focus within a container (for modals, dropdowns)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstElement?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * Handle escape key to close modals/dropdowns
   */
  handleEscapeKey(callback: () => void): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };
  },

  /**
   * Handle arrow key navigation for lists/menus
   */
  handleArrowNavigation(
    container: HTMLElement,
    itemSelector: string,
    options: {
      vertical?: boolean;
      horizontal?: boolean;
      loop?: boolean;
    } = {}
  ): () => void {
    const { vertical = true, horizontal = false, loop = true } = options;
    
    const handleArrowKeys = (e: KeyboardEvent) => {
      const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
      const currentIndex = items.findIndex(item => item === document.activeElement);
      
      if (currentIndex === -1) return;
      
      let nextIndex = currentIndex;
      
      if (vertical && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          nextIndex = loop ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
        } else {
          nextIndex = loop ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
        }
      }
      
      if (horizontal && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowRight') {
          nextIndex = loop ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
        } else {
          nextIndex = loop ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
        }
      }
      
      if (nextIndex !== currentIndex) {
        items[nextIndex]?.focus();
      }
    };
    
    container.addEventListener('keydown', handleArrowKeys);
    
    return () => {
      container.removeEventListener('keydown', handleArrowKeys);
    };
  }
};

// Screen reader utilities
export const ScreenReader = {
  /**
   * Announce text to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Create visually hidden text for screen readers
   */
  createVisuallyHidden(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  },

  /**
   * Generate unique IDs for ARIA relationships
   */
  generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// ARIA utilities
export const ARIA = {
  /**
   * Set up ARIA live region for dynamic content updates
   */
  setupLiveRegion(element: HTMLElement, level: 'polite' | 'assertive' = 'polite'): void {
    element.setAttribute('aria-live', level);
    element.setAttribute('aria-atomic', 'true');
  },

  /**
   * Set up ARIA expanded state for collapsible content
   */
  setExpanded(trigger: HTMLElement, target: HTMLElement, expanded: boolean): void {
    trigger.setAttribute('aria-expanded', expanded.toString());
    target.setAttribute('aria-hidden', (!expanded).toString());
    
    if (!trigger.hasAttribute('aria-controls')) {
      const targetId = target.id || ScreenReader.generateId('collapsible');
      target.id = targetId;
      trigger.setAttribute('aria-controls', targetId);
    }
  },

  /**
   * Set up ARIA describedby relationship
   */
  setDescribedBy(element: HTMLElement, descriptionElement: HTMLElement): void {
    const descId = descriptionElement.id || ScreenReader.generateId('description');
    descriptionElement.id = descId;
    
    const existingDescribedBy = element.getAttribute('aria-describedby');
    const describedBy = existingDescribedBy ? `${existingDescribedBy} ${descId}` : descId;
    element.setAttribute('aria-describedby', describedBy);
  },

  /**
   * Set up ARIA labelledby relationship
   */
  setLabelledBy(element: HTMLElement, labelElement: HTMLElement): void {
    const labelId = labelElement.id || ScreenReader.generateId('label');
    labelElement.id = labelId;
    element.setAttribute('aria-labelledby', labelId);
  }
};

// Focus management utilities
export const FocusManagement = {
  /**
   * Save current focus and return a function to restore it
   */
  saveFocus(): () => void {
    const activeElement = document.activeElement as HTMLElement;
    
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  },

  /**
   * Find the first focusable element in a container
   */
  findFirstFocusable(container: HTMLElement): HTMLElement | null {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    return focusableElements[0] || null;
  },

  /**
   * Check if an element is focusable
   */
  isFocusable(element: HTMLElement): boolean {
    if (element.hasAttribute('disabled') || element.getAttribute('tabindex') === '-1') {
      return false;
    }
    
    const focusableSelectors = [
      'button', 'a[href]', 'input', 'select', 'textarea', '[tabindex]'
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  }
};

// Validation utilities for accessibility
export const AccessibilityValidator = {
  /**
   * Check if an element has proper ARIA labels
   */
  hasProperLabeling(element: HTMLElement): boolean {
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasAssociatedLabel = element.id && document.querySelector(`label[for="${element.id}"]`);
    const hasInnerText = element.textContent?.trim().length > 0;
    
    return hasAriaLabel || hasAriaLabelledBy || !!hasAssociatedLabel || !!hasInnerText;
  },

  /**
   * Check if interactive elements are keyboard accessible
   */
  isKeyboardAccessible(element: HTMLElement): boolean {
    const isNativelyFocusable = ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());
    const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
    
    return isNativelyFocusable || hasTabIndex;
  },

  /**
   * Validate color contrast for text elements
   */
  validateColorContrast(element: HTMLElement): { passes: boolean; ratio: number } {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // Convert RGB to hex (simplified - would need more robust conversion in production)
    const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/\d+/g);
      if (!match) return '#000000';
      
      const [r, g, b] = match.map(Number);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };
    
    try {
      const foregroundHex = rgbToHex(color);
      const backgroundHex = rgbToHex(backgroundColor);
      
      const ratio = ColorContrast.getContrastRatio(foregroundHex, backgroundHex);
      const passes = ratio >= 4.5;
      
      return { passes, ratio };
    } catch {
      return { passes: false, ratio: 0 };
    }
  }
};