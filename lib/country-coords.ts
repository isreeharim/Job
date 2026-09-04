export interface CountryGeo {
  lat: number;
  lng: number;
  name: string;
  flag: string;
}

export const COUNTRY_GEO: Record<string, CountryGeo> = {
  IN: { lat: 20.5937, lng: 78.9629, name: "India", flag: "🇮🇳" },
  US: { lat: 37.0902, lng: -95.7129, name: "United States", flag: "🇺🇸" },
  GB: { lat: 55.3781, lng: -3.4360, name: "United Kingdom", flag: "🇬🇧" },
  CA: { lat: 56.1304, lng: -106.3468, name: "Canada", flag: "🇨🇦" },
  DE: { lat: 51.1657, lng: 10.4515, name: "Germany", flag: "🇩🇪" },
  FR: { lat: 46.2276, lng: 2.2137, name: "France", flag: "🇫🇷" },
  AU: { lat: -25.2744, lng: 133.7751, name: "Australia", flag: "🇦🇺" },
  SG: { lat: 1.3521, lng: 103.8198, name: "Singapore", flag: "🇸🇬" },
  NL: { lat: 52.1326, lng: 5.2913, name: "Netherlands", flag: "🇳🇱" },
  ES: { lat: 40.4637, lng: -3.7492, name: "Spain", flag: "🇪🇸" },
  IT: { lat: 41.8719, lng: 12.5674, name: "Italy", flag: "🇮🇹" },
  BR: { lat: -14.2350, lng: -51.9253, name: "Brazil", flag: "🇧🇷" },
  JP: { lat: 36.2048, lng: 138.2529, name: "Japan", flag: "🇯🇵" },
  AE: { lat: 23.4241, lng: 53.8478, name: "United Arab Emirates", flag: "🇦🇪" },
  SE: { lat: 60.1282, lng: 18.6435, name: "Sweden", flag: "🇸🇪" },
  PL: { lat: 51.9194, lng: 19.1451, name: "Poland", flag: "🇵🇱" },
  CH: { lat: 46.8182, lng: 8.2275, name: "Switzerland", flag: "🇨🇭" },
  IE: { lat: 53.1424, lng: -7.6921, name: "Ireland", flag: "🇮🇪" },
  NZ: { lat: -40.9006, lng: 174.8860, name: "New Zealand", flag: "🇳🇿" },
  ZA: { lat: -30.5595, lng: 22.9375, name: "South Africa", flag: "🇿🇦" },
  PH: { lat: 12.8797, lng: 121.7740, name: "Philippines", flag: "🇵🇭" },
  PK: { lat: 30.3753, lng: 69.3451, name: "Pakistan", flag: "🇵🇰" },
  BD: { lat: 23.6850, lng: 90.3563, name: "Bangladesh", flag: "🇧🇩" },
  NG: { lat: 9.0820, lng: 8.6753, name: "Nigeria", flag: "🇳🇬" },
  MX: { lat: 23.6345, lng: -102.5528, name: "Mexico", flag: "🇲🇽" },
  ID: { lat: -0.7893, lng: 113.9213, name: "Indonesia", flag: "🇮🇩" },
  KR: { lat: 35.9078, lng: 127.7669, name: "South Korea", flag: "🇰🇷" },
  CN: { lat: 35.8617, lng: 104.1954, name: "China", flag: "🇨🇳" },
  RU: { lat: 61.5240, lng: 105.3188, name: "Russia", flag: "🇷🇺" },
  PT: { lat: 39.3999, lng: -8.2245, name: "Portugal", flag: "🇵🇹" },
  BE: { lat: 50.5039, lng: 4.4699, name: "Belgium", flag: "🇧🇪" },
  AT: { lat: 47.5162, lng: 14.5501, name: "Austria", flag: "🇦🇹" },
  NO: { lat: 60.4720, lng: 8.4689, name: "Norway", flag: "🇳🇴" },
  DK: { lat: 56.2639, lng: 9.5018, name: "Denmark", flag: "🇩🇰" },
  FI: { lat: 61.9241, lng: 25.7482, name: "Finland", flag: "🇫🇮" },
  IL: { lat: 31.0461, lng: 34.8516, name: "Israel", flag: "🇮🇱" },
  TR: { lat: 38.9637, lng: 35.2433, name: "Turkey", flag: "🇹🇷" },
  UA: { lat: 48.3794, lng: 31.1656, name: "Ukraine", flag: "🇺🇦" },
  RO: { lat: 45.9432, lng: 24.9668, name: "Romania", flag: "🇷🇴" },
  CZ: { lat: 49.8175, lng: 15.4730, name: "Czech Republic", flag: "🇨🇿" },
  GR: { lat: 39.0742, lng: 21.8243, name: "Greece", flag: "🇬🇷" },
  HU: { lat: 47.1625, lng: 19.5033, name: "Hungary", flag: "🇭🇺" },
  AR: { lat: -38.4161, lng: -63.6167, name: "Argentina", flag: "🇦🇷" },
  CL: { lat: -35.6751, lng: -71.5430, name: "Chile", flag: "🇨🇱" },
  CO: { lat: 4.5709, lng: -74.2973, name: "Colombia", flag: "🇨🇴" },
  MY: { lat: 4.2105, lng: 101.9758, name: "Malaysia", flag: "🇲🇾" },
  TH: { lat: 15.8700, lng: 100.9925, name: "Thailand", flag: "🇹🇭" },
  VN: { lat: 14.0583, lng: 108.2772, name: "Vietnam", flag: "🇻🇳" },
  EG: { lat: 26.8206, lng: 30.8025, name: "Egypt", flag: "🇪🇬" },
  KE: { lat: -0.0236, lng: 37.9062, name: "Kenya", flag: "🇰🇪" },
  SA: { lat: 23.8859, lng: 45.0792, name: "Saudi Arabia", flag: "🇸🇦" },
};

export function getCountryGeo(countryCode: string): CountryGeo {
  const code = (countryCode || "").toUpperCase().trim();
  if (COUNTRY_GEO[code]) {
    return COUNTRY_GEO[code];
  }
  return {
    lat: 20.0,
    lng: 0.0,
    name: code === "UNKNOWN" || !code ? "Global Edge" : code,
    flag: "🌐",
  };
}
