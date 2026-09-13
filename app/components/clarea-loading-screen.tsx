"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Props = { isLoading?: boolean };
const petals = [
  "M100 22C94 32 84 44 84 55C84 76 116 76 116 55C116 44 106 32 100 22Z",
  "M96 121C63 119 37 92 32 62C67 68 91 87 96 121Z",
  "M106 121C139 114 165 90 166 64C131 73 110 91 106 121Z",
  "M100 145C77 119 26 113 17 143C5 187 61 182 100 145C139 109 183 125 184 150C185 183 139 182 100 145Z",
];

/** Controlled overlay: keep mounted for its exit transition. */
export default function ClareaLoadingScreen({ isLoading = true }: Props) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="clarea-loader"
          role="status"
          aria-live="polite"
          aria-label="Preparing your glow. Please wait."
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="fixed inset-0 z-[100] grid min-h-dvh place-items-center overflow-hidden bg-[#FAF6F0] p-6 text-[#5C1A2B]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FFFFFF_0%,#FAF6F0_55%,#F0E5D8_100%)]"
          />
          <div aria-hidden="true" className="relative flex w-full max-w-sm flex-col items-center">
            <div className="relative grid size-[190px] place-items-center sm:size-[220px]">
              <motion.svg
                viewBox="0 0 240 240"
                className="absolute inset-0 h-full w-full"
                fill="none"
                animate={reduced ? {} : { rotate: [0, 360] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                <circle
                  cx="120"
                  cy="120"
                  r="111"
                  stroke="#C9A05C"
                  strokeWidth="0.6"
                  opacity="0.16"
                />
                <path
                  d="M120 9A111 111 0 0 1 226 87"
                  stroke="#C9A05C"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                <circle cx="226" cy="87" r="2" fill="#C9A05C" opacity="0.8" />
              </motion.svg>
              <svg
                viewBox="0 0 200 200"
                fill="none"
                className="relative h-[64%] w-[64%] overflow-visible"
              >
                {petals.map((path, i) => (
                  <g key={path}>
                    <path
                      d={path}
                      stroke="#C9A05C"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      opacity="0.13"
                    />
                    <motion.path
                      d={path}
                      stroke="#C9A05C"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        reduced
                          ? { pathLength: 1, opacity: 1 }
                          : {
                              pathLength: [0, 0, 1, 1, 0],
                              opacity: [0, 0, 1, 1, 0],
                            }
                      }
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        times: [0, 0.06 + i * 0.09, 0.38 + i * 0.09, 0.84, 1],
                        ease: "easeInOut",
                      }}
                    />
                  </g>
                ))}
              </svg>
            </div>

            <h1
              className="mt-5 mb-0 text-[clamp(3.5rem,15vw,4.5rem)] leading-none tracking-[-0.055em]"
              style={{ fontFamily: '"Times New Roman", Georgia, serif', fontWeight: 400 }}
            >
              Claréa
            </h1>
            <div className="mt-5 flex items-center gap-3 text-[#AC8953]">
              <span className="h-px w-6 bg-[#C9A05C]/45" />
              <span className="text-[8px] tracking-[0.3em] sm:text-[9px]">
                SKINCARE &amp; GIFTING
              </span>
              <span className="h-px w-6 bg-[#C9A05C]/45" />
            </div>

            <div className="mt-12 h-[2px] w-32 overflow-hidden rounded-full bg-[#E9DFD2]">
              <motion.div
                className="h-full w-1/3 rounded-full bg-[#C9A05C]"
                animate={reduced ? { x: "100%" } : { x: ["-100%", "300%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="mt-5 mb-0 text-center text-[9px] tracking-[0.22em] text-[#9C8A79]">
              PREPARING YOUR GLOW...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
