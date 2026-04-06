const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function pick(n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  }
  return s;
}

/** e.g. MH-X7K-4P92 — avoids ambiguous 0/O and 1/I */
export function randomPlateCandidate(prefix = "MH") {
  return `${prefix}-${pick(3)}-${pick(4)}`;
}
