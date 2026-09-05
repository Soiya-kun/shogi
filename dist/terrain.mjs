export const CELL_SIZE = 12;
export const HALF_FIELD = CELL_SIZE * 4.5;
export const cellXZ = i => [(i % 9 - 4) * CELL_SIZE, (Math.floor(i / 9) - 4) * CELL_SIZE];
export function cellAt(x, z) {
  if (x < -HALF_FIELD || z < -HALF_FIELD || x >= HALF_FIELD || z >= HALF_FIELD) return null;
  return Math.floor((z + HALF_FIELD) / CELL_SIZE) * 9 + Math.floor((x + HALF_FIELD) / CELL_SIZE);
}

// Spatial bins retain the actual exported GLB triangles. Height and picking use
// the same surface, including artist edits to the mesh; no duplicated height formula.
export function terrainSampler(positions, indices, binSize=4) {
  const bins = new Map();
  const index = indices || Array.from({length: positions.length / 3}, (_, i) => i);
  for (let i = 0; i < index.length; i += 3) {
    const tri = Array.from(index.slice(i, i + 3), j => Array.from(positions.slice(j * 3, j * 3 + 3)));
    const xs = tri.map(p => p[0]), zs = tri.map(p => p[2]);
    for (let x = Math.floor(Math.min(...xs)/binSize); x <= Math.floor(Math.max(...xs)/binSize); x++)
      for (let z = Math.floor(Math.min(...zs)/binSize); z <= Math.floor(Math.max(...zs)/binSize); z++) {
        const key = x + ',' + z;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(tri);
      }
  }
  return (x, z) => {
    for (const [a,b,c] of bins.get(Math.floor(x/binSize) + ',' + Math.floor(z/binSize)) || []) {
      const det = (b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      if (Math.abs(det) < 1e-10) continue;
      const u = ((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det;
      const v = ((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;
      if (u >= -1e-5 && v >= -1e-5 && u+v <= 1.00001) return u*a[1]+v*b[1]+(1-u-v)*c[1];
    }
    throw new Error(`Terrain has no surface at ${x}, ${z}`);
  };
}
