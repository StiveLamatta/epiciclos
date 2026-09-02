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
      const ratio = remainingDist / distToNext;
      const newX = currentPt.x + dx * ratio;
      const newY = currentPt.y + dy * ratio;
      
      const newPt = { x: newX, y: newY };
      resampled.push(newPt);
      
      currentPt = newPt;
      remainingDist = spacing;
    } else {
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
  if (!points || points.length === 0) return { x: 0, y: 0 };
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
 * Centripetal Catmull-Rom Spline (alpha = 0.5)
 * Prevents cusps, loops, and self-intersections.
 * Smoothly interpolates through any 2, 3, or N control points.
 */
export function generateSpline(points, segments = 16, isClosed = false) {
  if (!points || points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];
  if (points.length === 2) {
    const res = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      res.push({
        x: points[0].x + (points[1].x - points[0].x) * t,
        y: points[0].y + (points[1].y - points[0].y) * t,
      });
    }
    return res;
  }

  // Helper for centripetal parameterization
  const getT = (tPrev, pA, pB, alpha = 0.5) => {
    const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    return tPrev + Math.pow(dist, alpha);
  };

  const p = [...points];
  if (isClosed) {
    p.unshift(points[points.length - 1]);
    p.push(points[0]);
    p.push(points[1]);
  } else {
    const pStart = {
      x: points[0].x - (points[1].x - points[0].x),
      y: points[0].y - (points[1].y - points[0].y)
    };
    const pEnd = {
      x: points[points.length - 1].x + (points[points.length - 1].x - points[points.length - 2].x),
      y: points[points.length - 1].y + (points[points.length - 1].y - points[points.length - 2].y)
    };
    p.unshift(pStart);
    p.push(pEnd);
  }

  const result = [];

  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    const t0 = 0;
    const t1 = getT(t0, p0, p1);
    const t2 = getT(t1, p1, p2);
    const t3 = getT(t2, p2, p3);

    if (Math.abs(t2 - t1) < 1e-5) continue;

    for (let s = 0; s < segments; s++) {
      const t = t1 + (s / segments) * (t2 - t1);

      const a1_x = (t1 - t !== 0 && t1 - t0 !== 0) ? ((t1 - t) / (t1 - t0)) * p0.x + ((t - t0) / (t1 - t0)) * p1.x : p1.x;
      const a1_y = (t1 - t !== 0 && t1 - t0 !== 0) ? ((t1 - t) / (t1 - t0)) * p0.y + ((t - t0) / (t1 - t0)) * p1.y : p1.y;

      const a2_x = (t2 - t1 !== 0) ? ((t2 - t) / (t2 - t1)) * p1.x + ((t - t1) / (t2 - t1)) * p2.x : p1.x;
      const a2_y = (t2 - t1 !== 0) ? ((t2 - t) / (t2 - t1)) * p1.y + ((t - t1) / (t2 - t1)) * p2.y : p1.y;

      const a3_x = (t3 - t2 !== 0) ? ((t3 - t) / (t3 - t2)) * p2.x + ((t - t2) / (t3 - t2)) * p3.x : p2.x;
      const a3_y = (t3 - t2 !== 0) ? ((t3 - t) / (t3 - t2)) * p2.y + ((t - t2) / (t3 - t2)) * p3.y : p2.y;

      const b1_x = (t2 - t0 !== 0) ? ((t2 - t) / (t2 - t0)) * a1_x + ((t - t0) / (t2 - t0)) * a2_x : a1_x;
      const b1_y = (t2 - t0 !== 0) ? ((t2 - t) / (t2 - t0)) * a1_y + ((t - t0) / (t2 - t0)) * a2_y : a1_y;

      const b2_x = (t3 - t1 !== 0) ? ((t3 - t) / (t3 - t1)) * a2_x + ((t - t1) / (t3 - t1)) * a3_x : a2_x;
      const b2_y = (t3 - t1 !== 0) ? ((t3 - t) / (t3 - t1)) * a2_y + ((t - t1) / (t3 - t1)) * a3_y : a2_y;

      const c_x = (t2 - t1 !== 0) ? ((t2 - t) / (t2 - t1)) * b1_x + ((t - t1) / (t2 - t1)) * b2_x : b1_x;
      const c_y = (t2 - t1 !== 0) ? ((t2 - t) / (t2 - t1)) * b1_y + ((t - t1) / (t2 - t1)) * b2_y : b1_y;

      result.push({ x: c_x, y: c_y });
    }
  }

  if (!isClosed && points.length > 0) {
    result.push({ ...points[points.length - 1] });
  }

  return result;
}

/**
 * Renderiza un trazo que puede mezclar segmentos rectos y curvas, con opción de cerrar el trazo.
 * Cada punto tiene `{ x, y, isCurve: boolean }`.
 */
export function renderMixedPoints(points, segments = 16, isClosed = false) {
  if (!points || points.length === 0) return [];
  
  let workingPoints = [...points];
  if (isClosed && points.length >= 3) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) > 2) {
      workingPoints.push({ ...first });
    }
  }

  if (workingPoints.length < 3) return workingPoints;

  const hasCurve = workingPoints.some(p => p.isCurve === true);
  if (!hasCurve) return workingPoints;

  const allCurve = workingPoints.every(p => p.isCurve === true);
  if (allCurve) return generateSpline(workingPoints, segments, isClosed);

  const result = [];
  let currentGroup = [workingPoints[0]];

  for (let i = 1; i < workingPoints.length; i++) {
    const prevPt = workingPoints[i - 1];
    const currPt = workingPoints[i];

    const isPrevCurve = !!prevPt.isCurve;
    const isCurrCurve = !!currPt.isCurve;

    if (isPrevCurve === isCurrCurve) {
      currentGroup.push(currPt);
    } else {
      if (isPrevCurve && currentGroup.length >= 2) {
        const splinePts = generateSpline(currentGroup, segments, false);
        if (result.length > 0) splinePts.shift();
        result.push(...splinePts);
      } else {
        if (result.length > 0) {
          result.push(...currentGroup.slice(1));
        } else {
          result.push(...currentGroup);
        }
      }
      currentGroup = [prevPt, currPt];
    }
  }

  if (currentGroup.length > 0) {
    const isCurveGroup = !!currentGroup[currentGroup.length - 1].isCurve;
    if (isCurveGroup && currentGroup.length >= 2) {
      const splinePts = generateSpline(currentGroup, segments, false);
      if (result.length > 0) splinePts.shift();
      result.push(...splinePts);
    } else {
      if (result.length > 0) {
        result.push(...currentGroup.slice(1));
      } else {
        result.push(...currentGroup);
      }
    }
  }

  return result.length > 0 ? result : workingPoints;
}
