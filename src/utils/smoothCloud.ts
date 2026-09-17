export function isPointInsideBoundary(
  longitude: number,
  latitude: number,
  boundary: Array<[number, number]>,
) {
  let inside = false

  for (
    let currentIndex = 0, previousIndex = boundary.length - 1;
    currentIndex < boundary.length;
    previousIndex = currentIndex++
  ) {
    const [currentLongitude, currentLatitude] = boundary[currentIndex]
    const [previousLongitude, previousLatitude] = boundary[previousIndex]
    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude

    if (!crossesLatitude) continue

    const crossingLongitude =
      ((previousLongitude - currentLongitude) *
        (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) +
      currentLongitude

    if (longitude < crossingLongitude) inside = !inside
  }

  return inside
}

export function getSmoothCloudValidTime(nowMs = Date.now()) {
  const validTime = new Date(nowMs)
  validTime.setUTCMinutes(0, 0, 0)
  validTime.setUTCHours(validTime.getUTCHours() + 1)
  return validTime.getTime()
}
