"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { calculateLandingRotation, getRandomFullSpins } from "../../utils/wheelRotation";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface WheelSegment {
  id: string;
  label: string;
  value?: string;
  color?: string;
  textColor?: string;
}

export interface WheelOfFortuneProps {
  segments: WheelSegment[];
  colors?: string[];
  outerRingColor?: string;
  pointerColor?: string;
  hubColor?: string;
  minFullSpins?: number;
  maxFullSpins?: number;
  disabled?: boolean;
  soundEnabled?: boolean;
  className?: string;
  spinLabel?: string;
  spinningLabel?: string;
  getWinningIndex?: (segments: WheelSegment[]) => number;
  onSpinStart?: (segment: WheelSegment, index: number) => void;
  onSpinEnd?: (prize: string, segment: WheelSegment, index: number) => void;
}

const DEFAULT_COLORS = ["#5C1A2B", "#C9A05C"];
const DEFAULT_OUTER_RING_COLOR = "#F5E9E2";
const DEFAULT_POINTER_COLOR = "#C9A05C";
const DEFAULT_HUB_COLOR = "#C9A05C";
const WHEEL_SIZE = 400;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = 176;
const OVERSHOOT_DEGREES = 1.7;

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function polarToCartesian(radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(angleInRadians),
    y: CENTER + radius * Math.sin(angleInRadians),
  };
}

function createSegmentPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(RADIUS, startAngle);
  const end = polarToCartesian(RADIUS, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function clampWinningIndex(index: number, totalSegments: number) {
  return Math.min(Math.max(Math.trunc(index), 0), totalSegments - 1);
}

export default function WheelOfFortune({
  segments,
  colors = DEFAULT_COLORS,
  outerRingColor = DEFAULT_OUTER_RING_COLOR,
  pointerColor = DEFAULT_POINTER_COLOR,
  hubColor = DEFAULT_HUB_COLOR,
  minFullSpins = 5,
  maxFullSpins = 7,
  disabled = false,
  soundEnabled = false,
  className = "",
  spinLabel = "Spin",
  spinningLabel = "Spinning...",
  getWinningIndex,
  onSpinStart,
  onSpinEnd,
}: WheelOfFortuneProps) {
  const rotation = useMotionValue(0);
  const currentRotationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickIndexRef = useRef<number | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [textBlurred, setTextBlurred] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);

  const segmentAngle = 360 / segments.length;
  const canSpin = !disabled && !isSpinning && segments.length > 1;

  const segmentViews = useMemo(
    () =>
      segments.map((segment, index) => {
        const startAngle = index * segmentAngle;
        const endAngle = startAngle + segmentAngle;
        const centerAngle = startAngle + segmentAngle / 2;

        return {
          ...segment,
          index,
          startAngle,
          endAngle,
          centerAngle,
          path: createSegmentPath(startAngle, endAngle),
          color: segment.color ?? colors[index % colors.length] ?? DEFAULT_COLORS[0],
          textColor: segment.textColor ?? "#FFFFFF",
        };
      }),
    [colors, segmentAngle, segments],
  );

  const playTick = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioContextRef.current ??= new AudioContextClass();
    const context = audioContextRef.current;

    void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.035);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }, [soundEnabled]);

  useEffect(() => {
    const unsubscribe = rotation.on("change", (latest) => {
      currentRotationRef.current = latest;

      if (!isSpinning || segments.length < 2) return;

      const pointerWheelAngle = normalizeDegrees(-latest);
      const tickIndex = Math.floor(pointerWheelAngle / segmentAngle);

      if (tickIndex !== lastTickIndexRef.current) {
        lastTickIndexRef.current = tickIndex;
        playTick();
      }
    });

    return unsubscribe;
  }, [isSpinning, playTick, rotation, segmentAngle, segments.length]);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    [],
  );

  const handleSpin = async () => {
    if (!canSpin) return;

    const targetIndex = clampWinningIndex(
      getWinningIndex ? getWinningIndex(segments) : Math.floor(Math.random() * segments.length),
      segments.length,
    );
    const targetSegment = segments[targetIndex];
    const fullSpins = getRandomFullSpins(minFullSpins, maxFullSpins);
    const { finalRotation } = calculateLandingRotation({
      currentRotation: currentRotationRef.current,
      targetSegmentIndex: targetIndex,
      totalSegments: segments.length,
      fullSpins,
    });

    setIsSpinning(true);
    setTextBlurred(true);
    setWinningIndex(null);
    lastTickIndexRef.current = null;
    onSpinStart?.(targetSegment, targetIndex);

    await animate(rotation, finalRotation + OVERSHOOT_DEGREES, {
      duration: 4.85,
      ease: [0.17, 0.67, 0.12, 0.99],
    });

    await animate(rotation, finalRotation, {
      type: "spring",
      stiffness: 520,
      damping: 32,
      mass: 0.55,
    });

    setTextBlurred(false);
    setIsSpinning(false);
    setWinningIndex(targetIndex);
    onSpinEnd?.(targetSegment.value ?? targetSegment.label, targetSegment, targetIndex);
  };

  if (segments.length < 2) {
    return (
      <div className={`rounded-lg border border-[#F5E9E2] p-5 text-center ${className}`}>
        Add at least two prize segments to render the wheel.
      </div>
    );
  }

  return (
    <div className={`mx-auto flex w-full max-w-[440px] flex-col items-center ${className}`}>
      <div className="relative aspect-square w-full select-none">
        <svg
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-label="Claréa spin to win wheel"
          role="img"
        >
          <defs>
            <filter id="winner-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="8"
                floodColor="#C9A05C"
                floodOpacity="0.95"
              />
            </filter>
          </defs>

          <motion.g
            style={{
              rotate: rotation,
              transformOrigin: `${CENTER}px ${CENTER}px`,
            }}
          >
            {segmentViews.map((segment) => {
              const isWinner = winningIndex === segment.index;
              const labelRadius = RADIUS * 0.63;

              return (
                <g key={segment.id}>
                  <motion.path
                    d={segment.path}
                    fill={segment.color}
                    stroke={outerRingColor}
                    strokeWidth="2"
                    filter={isWinner ? "url(#winner-glow)" : undefined}
                    animate={
                      isWinner
                        ? {
                            opacity: [1, 0.82, 1, 0.86, 1],
                            scale: [1, 1.018, 1, 1.012, 1],
                          }
                        : undefined
                    }
                    transition={{ duration: 1.15, ease: "easeOut" }}
                    style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
                  />

                  <motion.g
                    animate={{
                      opacity: textBlurred ? [1, 0.42, 0.72, 0.38, 1] : 1,
                      filter: textBlurred
                        ? ["blur(0px)", "blur(1.2px)", "blur(0.4px)", "blur(1px)", "blur(0px)"]
                        : "blur(0px)",
                    }}
                    transition={{ duration: 0.62, repeat: textBlurred ? Infinity : 0 }}
                    transform={`rotate(${segment.centerAngle} ${CENTER} ${CENTER}) translate(${CENTER} ${
                      CENTER - labelRadius
                    }) rotate(90)`}
                  >
                    <text
                      x="0"
                      y="0"
                      fill={segment.textColor}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-serif text-[17px] font-semibold tracking-[0px]"
                    >
                      {segment.label}
                    </text>
                  </motion.g>
                </g>
              );
            })}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 9}
              fill="none"
              stroke={outerRingColor}
              strokeWidth="14"
            />
          </motion.g>
        </svg>

        <div className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2">
          <svg viewBox="0 0 54 62" className="h-14 w-12 drop-shadow-lg" aria-hidden="true">
            <path
              d="M27 60 7 18C3 9 10 1 20 7l7 4 7-4c10-6 17 2 13 11L27 60Z"
              fill={pointerColor}
              stroke="#FDF8F4"
              strokeWidth="3"
            />
          </svg>
        </div>

        <motion.div
          className="absolute left-1/2 top-1/2 z-20 grid size-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[6px] border-[#F5E9E2] shadow-[0_18px_45px_rgba(92,26,43,0.25)]"
          style={{ backgroundColor: hubColor }}
          animate={isSpinning ? { rotate: [0, -10, 8, 0] } : { rotate: 0 }}
          transition={{ duration: 1.2, repeat: isSpinning ? Infinity : 0 }}
        >
          <svg viewBox="0 0 72 72" className="h-[58%] w-[58%] text-[#F5E9E2]" aria-hidden="true">
            <path
              d="M36 10C43 23 60 24 60 38c0 9-8 15-17 11 0 8-4 13-7 13s-7-5-7-13c-9 4-17-2-17-11 0-14 17-15 24-28Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
            <path
              d="M36 13v39M26 34c6-4 14-4 20 0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <circle cx="36" cy="19" r="3.5" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={!canSpin}
        className="mt-7 min-h-12 rounded-full bg-[#5C1A2B] px-9 font-serif text-base font-semibold text-white shadow-[0_16px_32px_rgba(92,26,43,0.24)] transition hover:bg-[#461321] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        {isSpinning ? spinningLabel : spinLabel}
      </button>
    </div>
  );
}
