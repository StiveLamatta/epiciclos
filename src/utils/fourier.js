export function dft(x) {
  const X = [];
  const N = x.length;

  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n++) {
      const phi = (2 * Math.PI * k * n) / N;
      re += x[n].re * Math.cos(phi) + x[n].im * Math.sin(phi);
      im -= x[n].re * Math.sin(phi) - x[n].im * Math.cos(phi);
    }

    re = re / N;
    im = im / N;

    let freq = k;
    if (k > N / 2) {
      freq = k - N;
    }
    let amp = Math.sqrt(re * re + im * im);
    let phase = Math.atan2(im, re);

    X[k] = { re, im, freq, amp, phase };
  }

  // Orden inicial por amplitud
  X.sort((a, b) => b.amp - a.amp);

  return X;
}

/**
 * Procesa la lista de componentes de Fourier:
 * 1. Ordena los epiciclos (de mayor a menor radio o por frecuencia natural).
 * 2. Descompone/parte los primeros N epiciclos siguiendo una secuencia proporcional elegible (ej. 3, 2, 1).
 */
export function processFourierEpicycles(fourierList, {
  sortDesc = true,
  splitCount = 0,
  splitSequence = '3,2,1'
} = {}) {
  if (!fourierList || fourierList.length === 0) return [];

  let list = [...fourierList];

  // 1. Ordenamiento
  if (sortDesc) {
    list.sort((a, b) => b.amp - a.amp);
  } else {
    list.sort((a, b) => Math.abs(a.freq) - Math.abs(b.freq));
  }

  // 2. Partición proporcional de los N primeros epiciclos
  if (splitCount > 0) {
    const rawWeights = String(splitSequence)
      .split(/[,;\s]+/)
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && v > 0);

    const weights = rawWeights.length > 0 ? rawWeights : [3, 2, 1];
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);

    const result = [];
    const countToSplit = Math.min(splitCount, list.length);

    for (let i = 0; i < list.length; i++) {
      const epi = list[i];
      if (i < countToSplit && totalWeight > 0) {
        for (let j = 0; j < weights.length; j++) {
          const ratio = weights[j] / totalWeight;
          result.push({
            ...epi,
            amp: epi.amp * ratio,
            re: epi.re * ratio,
            im: epi.im * ratio,
            isSubEpicycle: true,
            subIndex: j,
            parentIndex: i
          });
        }
      } else {
        result.push(epi);
      }
    }
    return result;
  }

  return list;
}
