import batangasData from "../data/batangas.json";

export const BATANGAS_PROVINCE = "Batangas";

export const getBatangasMunicipalities = () =>
  Object.keys(batangasData).sort((a, b) => a.localeCompare(b));

export const getBatangasBarangays = (municipality) => {
  if (!municipality) return [];
  return batangasData[municipality] || [];
};

export default {
  BATANGAS_PROVINCE,
  getBatangasMunicipalities,
  getBatangasBarangays,
};
