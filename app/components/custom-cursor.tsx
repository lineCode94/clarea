"use client";

import { useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

export default function CustomCursor() {
  const primaryCursorRef = useRef<HTMLDivElement>(null);
  const secondaryCursorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Position references to decouple animation from React state
  const mouse = useRef({ x: 0, y: 0 });
  const secondaryCursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);
    
    // Check if it's a touch device
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0
      );
    };
    checkTouch();

    if (isTouchDevice) return;

    // Try to show the popover to put it in the top layer
    const bringToTop = () => {
      if (popoverRef.current) {
        try {
          // @ts-ignore
          if (popoverRef.current.hidePopover) popoverRef.current.hidePopover();
          // @ts-ignore
          if (popoverRef.current.showPopover) popoverRef.current.showPopover();
        } catch (e) {}
      }
    };
    
    bringToTop();

    // Intercept native dialog showModal to keep cursor on top
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function () {
      originalShowModal.apply(this);
      setTimeout(bringToTop, 10);
    };

    // Track mouse movement
    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      
      // Immediately update primary cursor
      if (primaryCursorRef.current) {
        primaryCursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    // Hover state on interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if cursor should be hidden
      if (target.closest("[data-hide-cursor]")) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      if (
        target.tagName?.toLowerCase() === "a" ||
        target.tagName?.toLowerCase() === "button" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".cursor-pointer")
      ) {
        setIsHovering(true);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.closest("[data-hide-cursor]")) {
        setIsHidden(false);
      }

      if (
        target.tagName?.toLowerCase() === "a" ||
        target.tagName?.toLowerCase() === "button" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".cursor-pointer")
      ) {
        setIsHovering(false);
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    // Animation loop for secondary cursor (smoothing effect)
    let animationFrame: number;
    const render = () => {
      // Lerp for smooth trailing effect
      secondaryCursor.current.x += (mouse.current.x - secondaryCursor.current.x) * 0.15;
      secondaryCursor.current.y += (mouse.current.y - secondaryCursor.current.y) * 0.15;

      if (secondaryCursorRef.current) {
        secondaryCursorRef.current.style.transform = `translate3d(${secondaryCursor.current.x}px, ${secondaryCursor.current.y}px, 0)`;
      }
      
      animationFrame = requestAnimationFrame(render);
    };
    
    // Initialize secondary cursor position
    const onFirstMove = (e: MouseEvent) => {
      secondaryCursor.current = { x: e.clientX, y: e.clientY };
      window.removeEventListener("mousemove", onFirstMove);
      animationFrame = requestAnimationFrame(render);
    };
    window.addEventListener("mousemove", onFirstMove);

    return () => {
      HTMLDialogElement.prototype.showModal = originalShowModal;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", onFirstMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isTouchDevice]);

  if (!isMounted || isTouchDevice) return null;

  return createPortal(
    // @ts-ignore
    <div ref={popoverRef} popover="manual" className={`fixed inset-0 m-0 p-0 border-0 bg-transparent pointer-events-none z-[999999] overflow-visible w-full h-full transition-opacity duration-200 ${isHidden ? 'opacity-0' : 'opacity-100'}`}>
      <div
        ref={primaryCursorRef}
        className="fixed top-0 left-0 pointer-events-none will-change-transform"
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      >
        <div 
          className={`w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-[#C9A05C] transition-all duration-150 ease-out ${
            isHovering ? "scale-[2]" : "scale-100"
          } ${isClicking ? "scale-75" : ""}`}
        />
      </div>
      <div
        ref={secondaryCursorRef}
        className="fixed top-0 left-0 pointer-events-none will-change-transform"
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      >
        <div 
          className={`w-10 h-10 -ml-5 -mt-5 rounded-full border border-[#5C1A2B] transition-opacity duration-300 ease-out ${
            isHovering ? "opacity-60 scale-110" : "opacity-30 scale-100"
          } ${isClicking ? "scale-125 opacity-80" : ""}`}
        />
      </div>
    </div>,
    document.body
  );
}
