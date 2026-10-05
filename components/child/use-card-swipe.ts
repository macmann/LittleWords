"use client";
import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

/** Horizontal gestures leave vertical page scrolling and pinch zoom to the browser. */
export function useCardSwipe({
  onNext,
  onBack,
  canGoBack,
  disabled,
}: {
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  disabled: boolean;
}) {
  const start = useRef<{
    x: number;
    y: number;
    id: number;
    horizontal: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  function reset() {
    start.current = null;
    setOffset(0);
  }
  return {
    offset,
    dragging: offset !== 0,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLDivElement>) {
        if (!e.isPrimary) {
          reset();
          return;
        }
        suppressClick.current = false;
        if (disabled || e.button !== 0) return;
        const target = e.target as HTMLElement;
        // Image taps can become swipes; other controls keep their normal behavior.
        if (
          target.closest("button:not(.card-image), input, select, textarea, a")
        )
          return;
        start.current = {
          x: e.clientX,
          y: e.clientY,
          id: e.pointerId,
          horizontal: false,
        };
      },
      onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const gesture = start.current;
        if (!gesture || gesture.id !== e.pointerId) return;
        const dx = e.clientX - gesture.x,
          dy = e.clientY - gesture.y;
        if (!gesture.horizontal) {
          if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
            suppressClick.current = true;
            reset();
            return;
          }
          if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
          gesture.horizontal = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          suppressClick.current = true;
        }
        // Resist pulling backwards at the beginning; the session is always finite.
        const movement = dx > 0 && !canGoBack ? dx * 0.2 : dx;
        setOffset(Math.max(-120, Math.min(120, movement)));
      },
      onPointerUp(e: PointerEvent<HTMLDivElement>) {
        const gesture = start.current;
        if (!gesture || gesture.id !== e.pointerId) return;
        const dx = e.clientX - gesture.x;
        reset();
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        if (!gesture.horizontal || Math.abs(dx) < 60 || disabled) return;
        if (dx < 0) onNext();
        else if (canGoBack) onBack();
      },
      onPointerCancel() {
        reset();
      },
      onLostPointerCapture(e: PointerEvent<HTMLDivElement>) {
        // Touch starts with implicit capture on the image. Its bubbled loss when
        // capture moves to this container must not cancel the active swipe.
        if (e.target === e.currentTarget && start.current?.id === e.pointerId)
          reset();
      },
      onClickCapture(e: MouseEvent<HTMLDivElement>) {
        if (suppressClick.current && e.detail !== 0) {
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}
