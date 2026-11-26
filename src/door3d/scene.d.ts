/** The 18+ door as a place: see scene.js. */
export const ready: Promise<{ arrive(quick: boolean): void; open(o?: { onCover?: () => void }): Promise<void>; stop(): void }>;
