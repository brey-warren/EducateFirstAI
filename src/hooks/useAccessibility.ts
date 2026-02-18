import { useEffect, useRef, useCallback } from 'react';
import { 
  KeyboardNavigation, 
  ScreenReader, 
  ARIA, 
  FocusManagement 
} from '../utils/accessibility';

interface UseAccessibilityOptions {
  announceChanges?: boolean;
  trapFocus?: boolean;
  handleEscape?: () => void;
  arrowNavigation?: {
    itemSelector: string;
    vertical?: boolean;
    horizontal?: boolean;
    loop?: boolean;
  };
}

export const useAccessibility = (options: UseAccessibilityOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Announce changes to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (options.announceChanges !== false) {
      ScreenReader.announce(message, priority);
    }
  }, [options.announceChanges]);

  // Set up focus trap
  useEffect(() => {
    if (options.trapFocus && containerRef.current) {
      const cleanup = KeyboardNavigation.trapFocus(containerRef.current);
      cleanupFunctionsRef.current.push(cleanup);
      
      return () => {
        cleanup();
      };
    }
  }, [options.trapFocus]);

  // Set up escape key handling
  useEffect(() => {
    if (options.handleEscape) {
      const handleEscape = KeyboardNavigation.handleEscapeKey(options.handleEscape);
      document.addEventListener('keydown', handleEscape);
      
      const cleanup = () => document.removeEventListener('keydown', handleEscape);
      cleanupFunctionsRef.current.push(cleanup);
      
      return cleanup;
    }
  }, [options.handleEscape]);

  // Set up arrow key navigation
  useEffect(() => {
    if (options.arrowNavigation && containerRef.current) {
      const cleanup = KeyboardNavigation.handleArrowNavigation(
        containerRef.current,
        options.arrowNavigation.itemSelector,
        {
          vertical: options.arrowNavigation.vertical,
          horizontal: options.arrowNavigation.horizontal,
          loop: options.arrowNavigation.loop,
        }
      );
      
      cleanupFunctionsRef.current.push(cleanup);
      
      return cleanup;
    }
  }, [options.arrowNavigation]);

  // Cleanup all event listeners on unmount
  useEffect(() => {
    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, []);

  // ARIA utilities
  const setExpanded = useCallback((trigger: HTMLElement, target: HTMLElement, expanded: boolean) => {
    ARIA.setExpanded(trigger, target, expanded);
  }, []);

  const setDescribedBy = useCallback((element: HTMLElement, descriptionElement: HTMLElement) => {
    ARIA.setDescribedBy(element, descriptionElement);
  }, []);

  const setLabelledBy = useCallback((element: HTMLElement, labelElement: HTMLElement) => {
    ARIA.setLabelledBy(element, labelElement);
  }, []);

  // Focus management
  const saveFocus = useCallback(() => {
    return FocusManagement.saveFocus();
  }, []);

  const focusFirstElement = useCallback(() => {
    if (containerRef.current) {
      const firstFocusable = FocusManagement.findFirstFocusable(containerRef.current);
      firstFocusable?.focus();
    }
  }, []);

  return {
    containerRef,
    announce,
    setExpanded,
    setDescribedBy,
    setLabelledBy,
    saveFocus,
    focusFirstElement,
  };
};

// Hook for managing live regions
export const useLiveRegion = (level: 'polite' | 'assertive' = 'polite') => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveRegionRef.current) {
      ARIA.setupLiveRegion(liveRegionRef.current, level);
    }
  }, [level]);

  const announce = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
      
      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return {
    liveRegionRef,
    announce,
  };
};

// Hook for keyboard navigation in lists/menus
export const useKeyboardNavigation = (
  itemSelector: string,
  options: {
    vertical?: boolean;
    horizontal?: boolean;
    loop?: boolean;
    onSelect?: (item: HTMLElement) => void;
  } = {}
) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { vertical = true, horizontal = false, loop = true, onSelect } = options;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
      const currentIndex = items.findIndex(item => item === document.activeElement);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      // Arrow navigation
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

      // Enter or Space to select
      if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
        e.preventDefault();
        onSelect(items[currentIndex]);
      }

      // Home/End navigation
      if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = items.length - 1;
      }

      if (nextIndex !== currentIndex && items[nextIndex]) {
        items[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [itemSelector, options]);

  return { containerRef };
};

// Hook for managing modal accessibility
export const useModal = (isOpen: boolean, onClose: () => void) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<() => void>();

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      restoreFocusRef.current = FocusManagement.saveFocus();

      // Set up focus trap
      if (modalRef.current) {
        const cleanup = KeyboardNavigation.trapFocus(modalRef.current);
        
        // Handle escape key
        const handleEscape = KeyboardNavigation.handleEscapeKey(onClose);
        document.addEventListener('keydown', handleEscape);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          document.body.style.overflow = '';
          
          // Restore focus when modal closes
          if (restoreFocusRef.current) {
            restoreFocusRef.current();
          }
        };
      }
    }
  }, [isOpen, onClose]);

  return { modalRef };
};

// Hook for form accessibility
export const useFormAccessibility = () => {
  const generateId = useCallback((prefix: string = 'form-field') => {
    return ScreenReader.generateId(prefix);
  }, []);

  const associateLabel = useCallback((input: HTMLElement, label: HTMLElement) => {
    const inputId = input.id || generateId('input');
    input.id = inputId;
    label.setAttribute('for', inputId);
  }, [generateId]);

  const associateError = useCallback((input: HTMLElement, errorElement: HTMLElement) => {
    ARIA.setDescribedBy(input, errorElement);
    input.setAttribute('aria-invalid', 'true');
  }, []);

  const associateHelp = useCallback((input: HTMLElement, helpElement: HTMLElement) => {
    ARIA.setDescribedBy(input, helpElement);
  }, []);

  return {
    generateId,
    associateLabel,
    associateError,
    associateHelp,
  };
};