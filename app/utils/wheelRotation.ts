export interface LandingRotationOptions {
  currentRotation: number;
  targetSegmentIndex: number;
  totalSegments: number;
  fullSpins?: number;
  pointerAngle?: number;
}

export interface LandingRotationResult {
  finalRotation: number;
  normalizedFinalRotation: number;
  segmentAngle: number;
}

const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360;

export function getRandomFullSpins(min = 5, max = 7): number {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));

  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

export function calculateLandingRotation({
  currentRotation,
  targetSegmentIndex,
  totalSegments,
  fullSpins = 6,
  pointerAngle = 0,
}: LandingRotationOptions): LandingRotationResult {
  if (!Number.isInteger(totalSegments) || totalSegments < 2) {
    throw new Error("Wheel needs at least two segments.");
  }

  if (targetSegmentIndex < 0 || targetSegmentIndex >= totalSegments) {
    throw new Error("Winning segment index is outside the wheel segment range.");
  }

  const segmentAngle = 360 / totalSegments;
  const targetCenterAngle = targetSegmentIndex * segmentAngle + segmentAngle / 2;
  const normalizedCurrent = normalizeDegrees(currentRotation);
  const desiredFinalModulo = normalizeDegrees(pointerAngle - targetCenterAngle);
  const clockwiseOffset = normalizeDegrees(desiredFinalModulo - normalizedCurrent);
  const finalRotation = currentRotation + fullSpins * 360 + clockwiseOffset;

  return {
    finalRotation,
    normalizedFinalRotation: desiredFinalModulo,
    segmentAngle,
  };
}

export function calculateSpinRotation(
  currentRotation: number,
  targetSegmentIndex: number,
  totalSegments: number,
  spins = 5,
): number {
  return calculateLandingRotation({
    currentRotation,
    targetSegmentIndex,
    totalSegments,
    fullSpins: spins,
  }).finalRotation;
}
