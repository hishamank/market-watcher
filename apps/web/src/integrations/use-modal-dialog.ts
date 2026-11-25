import { type RefObject, useEffect, useRef } from "react";

const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isVisible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false;
  return getComputedStyle(element).visibility !== "hidden";
}

function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR);
  return Array.from(candidates).filter((element) => element.tabIndex >= 0 && isVisible(element));
}

function markOutsideInert(dialog: HTMLElement): HTMLElement[] {
  const marked: HTMLElement[] = [];
  let current: HTMLElement | null = dialog;
  while (current !== null && current !== dialog.ownerDocument.body) {
    const parent: HTMLElement | null = current.parentElement;
    if (parent === null) break;
    for (const child of Array.from(parent.children)) {
      if (child !== current && child instanceof HTMLElement && !child.inert) {
        child.inert = true;
        marked.push(child);
      }
    }
    current = parent;
  }
  return marked;
}

function trapTabKey(event: KeyboardEvent, dialog: HTMLElement): void {
  const tabbables = getTabbableElements(dialog);
  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  if (first === undefined || last === undefined) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const active = dialog.ownerDocument.activeElement;
  if (!(active instanceof HTMLElement) || !dialog.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  const index = tabbables.indexOf(active);
  if (event.shiftKey) {
    if (index === 0) {
      event.preventDefault();
      last.focus();
    } else if (index === -1) {
      const preceding = tabbables.findLast((el) =>
        Boolean(active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING),
      );
      event.preventDefault();
      (preceding ?? last).focus();
    }
    return;
  }
  if (index === tabbables.length - 1) {
    event.preventDefault();
    first.focus();
  } else if (index === -1) {
    const following = tabbables.find((el) =>
      Boolean(active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    event.preventDefault();
    (following ?? first).focus();
  }
}

export interface UseModalDialogOptions {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
  shouldReturnFocusRef: RefObject<boolean>;
  onEscape: () => void;
}

export function useModalDialog({
  open,
  dialogRef,
  initialFocusRef,
  returnFocusRef,
  shouldReturnFocusRef,
  onEscape,
}: UseModalDialogOptions): void {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (dialog === null) return undefined;

    const inertElements = markOutsideInert(dialog);
    const returnTarget = returnFocusRef.current;
    (initialFocusRef.current ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key === "Tab") {
        trapTabKey(event, dialog);
      }
    };

    dialog.ownerDocument.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.ownerDocument.removeEventListener("keydown", handleKeyDown);
      for (const element of inertElements) {
        element.inert = false;
      }
      if (shouldReturnFocusRef.current) {
        shouldReturnFocusRef.current = false;
        returnTarget?.focus();
      }
    };
  }, [open, dialogRef, initialFocusRef, returnFocusRef, shouldReturnFocusRef]);
}
