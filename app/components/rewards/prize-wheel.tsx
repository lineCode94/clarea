"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { TbTriangleFilled, TbGift } from "react-icons/tb";
import { rewardsConfig } from "../../config/rewards";
import type { Language } from "../../types/catalog";

export default function PrizeWheel({
  lang,
  rotation,
  duration,
  spinning,
  showPointer,
  onComplete,
}: {
  lang: Language;
  rotation: number;
  duration: number;
  spinning: boolean;
  showPointer: boolean;
  onComplete: () => void;
}) {
  const angle = useMotionValue(spinning ? 0 : rotation);
  useEffect(() => {
    if (!spinning || duration === 0) {
      angle.set(rotation);
      if (spinning) onComplete();
      return;
    }
    let cancelled = false;
    const start = angle.get();
    const cruiseDuration = Math.min(10, duration / 3);
    // Match the speed at the join: half the travel cruises, half decelerates.
    const midpoint = start + (rotation + 1.5 - start) / 2;
    let playback = animate(angle, midpoint, {
      duration: cruiseDuration,
      ease: [0.33, 0.3, 0.67, 0.67],
    });
    void (async () => {
      await playback;
      if (cancelled) return;
      playback = animate(angle, rotation + 1.5, {
        duration: duration - cruiseDuration,
        ease: [1 / 3, 2 / 3, 2 / 3, 1],
      });
      await playback;
      if (cancelled) return;
      playback = animate(angle, rotation, {
        type: "spring",
        stiffness: 600,
        damping: 30,
        mass: 0.4,
      });
      await playback;
      if (!cancelled) onComplete();
    })();
    return () => {
      cancelled = true;
      playback.stop();
    };
  }, [angle, rotation, duration, spinning, onComplete]);
  const prizes = rewardsConfig.prizes;
  const step = 360 / prizes.length;
  const point = (angle: number, radius: number) => [
    180 + radius * Math.cos((angle * Math.PI) / 180),
    180 + radius * Math.sin((angle * Math.PI) / 180),
  ];
  return (
    <div className="prize-wheel-frame relative aspect-square w-full" dir="ltr">
      {showPointer && (
        <TbTriangleFilled
          data-testid="prize-wheel-pointer"
          aria-hidden="true"
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 -rotate-90 text-champagne drop-shadow"
          size={30}
        />
      )}
      <div className="size-full overflow-hidden rounded-full border-[10px] border-[#F5E9E2] shadow-[0_0_0_6px_#f5f5f5,0_8px_24px_#00000020]">
        <motion.div
          data-testid="prize-wheel"
          initial={false}
          style={{ rotate: angle, willChange: spinning ? "transform" : "auto" }}
          className="size-full rounded-full"
        >
          <svg
            viewBox="0 0 360 360"
            className="size-full"
            role="img"
            aria-label={lang === "ar" ? "عجلة هدايا Claréa" : "Claréa gift wheel"}
          >
            {prizes.map((prize, i) => {
              const start = -step / 2 + i * step;
              const end = start + step;
              const a = point(start, 178);
              const b = point(end, 178);
              const label = point(i * step, 111);
              return (
                <g key={prize.id} data-prize-id={prize.id}>
                  <path
                    d={`M180,180 L${a.join(",")} A178,178 0 ${step > 180 ? 1 : 0},1 ${b.join(",")} Z`}
                    fill={prize.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                  <text
                    x={label[0]}
                    y={label[1]}
                    fill={prize.ink}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fontWeight="700"
                    direction={lang === "ar" ? "rtl" : "ltr"}
                    transform={`rotate(${i * step}, ${label[0]}, ${label[1]})`}
                  >
                    {prize.label[lang]}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>
      </div>
      <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-brand text-white shadow">
        <TbGift size={26} />
      </span>
    </div>
  );
}
