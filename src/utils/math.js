/**
 * Calculates the total length of a path defined by an array of points.
 */
export function getPathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.hypot(dx, dy);
  }
  return length;
}

/**
 * Resamples a path of points so that the new points are equally spaced
 * by `spacing` distance along the path.
 * This guarantees a high precision, uniform DFT calculation.
 */
export function resamplePath(points, spacing = 2) {
  if (points.length < 2) return [...points];
  
  const resampled = [];
  resampled.push({ ...points[0] });
  
  let currentPointIdx = 0;
  let remainingDist = spacing;
  let currentPt = points[0];
  
  while (currentPointIdx < points.length - 1) {
    const nextPt = points[currentPointIdx + 1];
    const dx = nextPt.x - currentPt.x;
    const dy = nextPt.y - currentPt.y;
    const distToNext = Math.hypot(dx, dy);
    
    if (distToNext === 0) {
      currentPointIdx++;
      continue;
    }
    
    if (remainingDist <= distToNext) {
      // We can fit the next resampled point on this line segment
      const ratio = remainingDist / distToNext;
      const newX = currentPt.x + dx * ratio;
      const newY = currentPt.y + dy * ratio;
      
      const newPt = { x: newX, y: newY };
      resampled.push(newPt);
      
      currentPt = newPt;
      remainingDist = spacing; // reset for next point
    } else {
      // The segment is too short, jump to next point and reduce remaining dist
      remainingDist -= distToNext;
      currentPt = nextPt;
      currentPointIdx++;
    }
  }
  
  return resampled;
}

/**
 * Calculates the barycenter (centroid) of an array of points.
 */
export function getBarycenter(points) {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (let p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Generates a smooth curve (Catmull-Rom Spline) from an array of control points.
 * Returns an array of points that form the smooth path.
 * @param {Array} points - Array of {x, y} control points
 * @param {Number} segments - Number of segments to generate between each control point
 * @param {Boolean} isClosed - Whether the curve should loop back to the start
 */
export function generateSpline(points, segments = 20, isClosed = false) {
  if (points.length < 3) return [...points];

  let p = [...points];
  
  // To draw a spline, we need extra points at the ends for the tension calculation.
  // If closed, we wrap around. If open, we duplicate the ends.
  if (isClosed) {
    p.unshift(points[points.length - 1]);
    p.unshift(points[points.length - 2]);
    p.push(points[0]);
    p.push(points[1]);
  } else {
    p.unshift(points[0]);
    p.push(points[points.length - 1]);
  }

  const result = [];
  
  const endIter = isClosed ? p.length - 3 : p.length - 2;

  for (let i = 1; i < endIter; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    for (let t = 0; t < segments; t++) {
      const t1 = t / segments;
      const t2 = t1 * t1;
      const t3 = t2 * t1;

      // Catmull-Rom math
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t1 +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t1 +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      result.push({ x, y });
    }
  }
  
  // Add the last point if it's not closed
  if (!isClosed) {
    result.push(points[points.length - 1]);
  }

  return result;
}
