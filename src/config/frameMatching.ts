// Both live providers currently publish at roughly ten-minute intervals.
// Fifteen minutes tolerates one missed/offset publication but not two.
export const MAX_FRAME_MATCH_DIFFERENCE_MINUTES = 15
export const MAX_FRAME_MATCH_DIFFERENCE_MS =
  MAX_FRAME_MATCH_DIFFERENCE_MINUTES * 60 * 1000

export const CLOSE_FRAME_MATCH_DIFFERENCE_MINUTES = 5
export const CLOSE_FRAME_MATCH_DIFFERENCE_MS =
  CLOSE_FRAME_MATCH_DIFFERENCE_MINUTES * 60 * 1000
