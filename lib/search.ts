/** Normalizacja do prostego wyszukiwania: bez polskich znaków i wielkich liter („łazienka” trafia w „lazienki”). */
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")
