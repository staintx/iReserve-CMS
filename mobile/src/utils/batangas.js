import batangasData from "../data/batangas.json";

export const BATANGAS_PROVINCE = "Batangas";

export const getBatangasMunicipalities = () =>
  Object.keys(batangasData).sort((a, b) => a.localeCompare(b));

export const getBatangasBarangays = (municipality) => {
  if (!municipality) return [];
  return batangasData[municipality] || [];
};

export const searchBatangasMunicipalities = (query) => {
  const all = getBatangasMunicipalities();
  if (!query || !query.trim()) return all;
  const q = query.trim().toLowerCase();
  return all.filter((m) => m.toLowerCase().includes(q));
};

export const searchBatangasBarangays = (municipality, query) => {
  const all = getBatangasBarangays(municipality);
  if (!query || !query.trim()) return all;
  const q = query.trim().toLowerCase();
  return all.filter((b) => b.toLowerCase().includes(q));
};

export default {
  BATANGAS_PROVINCE,
  getBatangasMunicipalities,
  getBatangasBarangays,
  searchBatangasMunicipalities,
  searchBatangasBarangays,
};

