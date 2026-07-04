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

  // Sort by amplitude (descending) so largest epicycles are drawn first
  X.sort((a, b) => b.amp - a.amp);

  return X;
}
