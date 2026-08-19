export interface SupplierProduct {
  id: string;
  reference: string;
  name: string;
  category: 'chambre_froide' | 'congelateur' | 'reserve_seche' | 'emballages' | 'boissons';
  defaultUnit: string;
  packageDetails?: string;
  unitPriceEstimate?: number;
  image: string;
  step?: number;
  presets?: number[];
  popular?: boolean;
}

export const SUPPLIER_CATEGORIES = [
  { id: 'all', label: 'Tous', icon: '✨' },
  { id: 'chambre_froide', label: 'Chambre Froide', icon: '❄️' },
  { id: 'congelateur', label: 'Congélateur', icon: '🧊' },
  { id: 'reserve_seche', label: 'Réserve Sèche', icon: '📦' },
  { id: 'emballages', label: 'Boîtes & Sacs', icon: '🍕' },
  { id: 'boissons', label: 'Boissons & Eaux', icon: '🥤' },
] as const;

export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct[] = [
  {
    "id": "prod_1653",
    "reference": "1653",
    "name": "MOZZARELLA CONTADORA RAPE FRAÎCHE 2.5KG",
    "category": "chambre_froide",
    "defaultUnit": "COL",
    "unitPriceEstimate": 58,
    "image": "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": true
  },
  {
    "id": "prod_1936",
    "reference": "1936",
    "name": "LE CHARCUTIER MERGUEZ PRE DECOUPE 800G ACHAHADA",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.8,
    "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": true
  },
  {
    "id": "prod_0201",
    "reference": "0201",
    "name": "TENDERS NON PIQUANT BEN'S 1KG IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.99,
    "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      4,
      7
    ],
    "popular": true
  },
  {
    "id": "prod_0975",
    "reference": "0975",
    "name": "CORDON BLEU BENKO 1KG",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.74,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": true
  },
  {
    "id": "prod_0078",
    "reference": "0078",
    "name": "HUILE de Tournesol - 10 FACTORY",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 17.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": true
  },
  {
    "id": "prod_0791",
    "reference": "0791",
    "name": "COCA COLA SLIM 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.99,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": true
  },
  {
    "id": "prod_0049",
    "reference": "0049",
    "name": "BOITE PIZZA T31 100 pcs",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.4,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": true
  },
  {
    "id": "prod_0991",
    "reference": "0991",
    "name": "VIANDE EGRENEE QUALITE SUPERIEUR 4MM 1KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 5,
    "image": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=300&auto=format&fit=crop&q=80",
    "presets": [
      2,
      3,
      5
    ],
    "popular": true
  },
  {
    "id": "prod_0037",
    "reference": "0037",
    "name": "FILET DE POULET/KG",
    "category": "chambre_froide",
    "defaultUnit": "Kg",
    "unitPriceEstimate": 5.6,
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    "presets": [
      5,
      10,
      15,
      20
    ],
    "popular": true
  },
  {
    "id": "prod_0227",
    "reference": "0227",
    "name": "SAUCE TOMATE AROMATISEE MUTTI 5/1",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": true
  },
  {
    "id": "prod_0971",
    "reference": "0971",
    "name": "FRITE BIG BEN'S 9/9 pré-salées 2.5kg",
    "category": "congelateur",
    "defaultUnit": "COL",
    "unitPriceEstimate": 12,
    "image": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=80",
    "presets": [
      2,
      4,
      6,
      10
    ],
    "popular": true
  },
  {
    "id": "prod_0143",
    "reference": "0143",
    "name": "CRISTALINE 50CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.5,
    "image": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": true
  },
  {
    "id": "prod_1568",
    "reference": "1568",
    "name": "SAUCE CARAMEL VAHINE SWEETIES 1KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.89,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1656",
    "reference": "1656",
    "name": "MAYONNAISE STICK COLONA 500 pcs",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 20.8,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1659",
    "reference": "1659",
    "name": "PAIN KEBAB SOF PAIN 100GR x 10PCS",
    "category": "congelateur",
    "defaultUnit": "COL",
    "unitPriceEstimate": 25,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1687",
    "reference": "1687",
    "name": "BOITE SANDWICH KRAFT 100 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1702",
    "reference": "1702",
    "name": "OLIVES NOIRES DENOYAUTEES 5/1 CAMPANIA",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 9.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1708",
    "reference": "1708",
    "name": "HARISSA BOITE 4/4 LA FLAMME DU CAP BON",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 8.25,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1722",
    "reference": "1722",
    "name": "CUILLÈRE A DESSERT 11CM EN BOIS *100PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 2.083,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1734",
    "reference": "1734",
    "name": "LAMELLES DE POULET KEBAB 1KG IQF",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.5,
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    "presets": [
      5,
      10,
      15,
      20
    ],
    "popular": false
  },
  {
    "id": "prod_1790",
    "reference": "1790",
    "name": "NUGGETS DE POULET FACTORY 1KG",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.74,
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    "presets": [
      5,
      10,
      15,
      20
    ],
    "popular": false
  },
  {
    "id": "prod_1801",
    "reference": "1801",
    "name": "PORTE-GOBELETS EN PAPIER 2 CPT 100 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1834",
    "reference": "1834",
    "name": "SERVIETTE 33*33 1PLY",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.99,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1836",
    "reference": "1836",
    "name": "CHEDDAR BURGER SLICES HOCHLAND 1033G",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.69,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1843",
    "reference": "1843",
    "name": "POIVRONS TRICOLORES LANIERES IQF 2,5kg",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.265,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1845",
    "reference": "1845",
    "name": "ORANGINA 1L5/6",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1853",
    "reference": "1853",
    "name": "MERGUEZ PRE DECOUPE JOUVIN 1KG IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 24.99,
    "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": false
  },
  {
    "id": "prod_1855",
    "reference": "1855",
    "name": "SAUCE FROMAGERE TACOS PRESIDENT 1L",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.08,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1889",
    "reference": "1889",
    "name": "STEAK SOJA CARPISA \" ACHAHADA \" 45G *130 ( 5,850 KG)",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 53.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1930",
    "reference": "1930",
    "name": "SAUCE MAYO SNACK MARDINAISE 5",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.95,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1937",
    "reference": "1937",
    "name": "LE CHARCUTIER LARDON VOLAILLE 1KG ACHAHADA",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.8,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_1987",
    "reference": "1987",
    "name": "FILET DE POULET 2KG5 ( PRIX CHOC )",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.744,
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    "presets": [
      5,
      10,
      15,
      20
    ],
    "popular": false
  },
  {
    "id": "prod_1991",
    "reference": "1991",
    "name": "SAUCE KETCHUP MARDINAISE 5L",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.7,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2047",
    "reference": "2047",
    "name": "TIRAMISU OREO & CHOCOLAT ALFIERO 100g x 12 Pcs",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.28,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2048",
    "reference": "2048",
    "name": "TIRAMISU SPECULOS ET CARAMEL ALFIERO 100g x 12 Pcs",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.28,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2049",
    "reference": "2049",
    "name": "TIRAMISU SPECULOS CHOCOLAT NOISETTE ALFIERO 100g x 12 Pcs",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.28,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2098",
    "reference": "2098",
    "name": "COCA COLA SLIM 33CL/12",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.991,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2099",
    "reference": "2099",
    "name": "COCA ZERO SLIM 33CL/12",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.019,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2100",
    "reference": "2100",
    "name": "FANTA ORANGE SLIM 33CL/12",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.991,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2101",
    "reference": "2101",
    "name": "STEAK SOJA CARPISA \" ACHAHADA \" 45G (4.95 KG)",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 45.6,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_2298",
    "reference": "2298",
    "name": "CORDON VOLAILLE 1KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.6,
    "image": "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3
    ],
    "popular": false
  },
  {
    "id": "prod_2299",
    "reference": "2299",
    "name": "NUGGETS DE POULET 1KG ( O'POULET )",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.99,
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    "presets": [
      5,
      10,
      15,
      20
    ],
    "popular": false
  },
  {
    "id": "prod_2346",
    "reference": "2346",
    "name": "FANTA CITRON FR 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0250",
    "reference": "0250",
    "name": "GANT NOIR TAILLE L 100 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.58,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0046",
    "reference": "0046",
    "name": "ROULEAU CAISSE THERMIQUE 79MM X 75M 5 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 9.4,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0192",
    "reference": "0192",
    "name": "OEUFS FRAIS PLEIN AIR FERMIER M *30",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0093",
    "reference": "0093",
    "name": "ROUGE DE VOLAILLE AL JADID 2,5 KG FRAIS",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 17.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0280",
    "reference": "0280",
    "name": "MIEL FLEUR 500G",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 4.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0581",
    "reference": "0581",
    "name": "PAPIER INGRAISSABLES 'FITTIPALDI' 28x34 CM ROUGE",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 17.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0090",
    "reference": "0090",
    "name": "PAPIER BURGER PAP03 25 X 32 CM X 1000PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 17,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0419",
    "reference": "0419",
    "name": "WINGS NATURE 1KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.6,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0007",
    "reference": "0007",
    "name": "CHEDDAR JALAPENOS 1KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0153",
    "reference": "0153",
    "name": "CAPRI SUN MULTIVITAMINE 1 PCS",
    "category": "boissons",
    "defaultUnit": "COL",
    "unitPriceEstimate": 12.9,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0173",
    "reference": "0173",
    "name": "7UP 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0133",
    "reference": "0133",
    "name": "COCA COLA ZERO SLIM 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.99,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0137",
    "reference": "0137",
    "name": "FANTA ORANGE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0651",
    "reference": "0651",
    "name": "HAWAI 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0142",
    "reference": "0142",
    "name": "OASIS POMME CASSIS FRAMBOISE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 16.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0140",
    "reference": "0140",
    "name": "OASIS TROPICAL 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.414,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0145",
    "reference": "0145",
    "name": "SCHWEPPES AGRUM 33CL 24 pcs",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.8,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0276",
    "reference": "0276",
    "name": "LARDON BATONNETS DE VEAU 2KG IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0348",
    "reference": "0348",
    "name": "OLIVES NOIRES RONDELLES 3/1",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 24.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0638",
    "reference": "0638",
    "name": "THON A L'HUILE 4/4 DI ANGELA 800G",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0970",
    "reference": "0970",
    "name": "FRITE BIG BEN'S 6/6 pré-salées 2.5kg",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 2.25,
    "image": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=80",
    "presets": [
      2,
      4,
      6,
      10
    ],
    "popular": false
  },
  {
    "id": "prod_0116",
    "reference": "0116",
    "name": "CREME FRAICHE EPAISSE 15% GFERM LE 5L FRAIS",
    "category": "chambre_froide",
    "defaultUnit": "COL",
    "unitPriceEstimate": 12.8,
    "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0602",
    "reference": "0602",
    "name": "LEVURE 42*12 FALA MENAGERE FRAIS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 16.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0256",
    "reference": "0256",
    "name": "CHEVRE TRANCHE IQF 500G",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 4,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0257",
    "reference": "0257",
    "name": "POMME DE TERRE CUBE JOSY 2,5 KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.75,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0119",
    "reference": "0119",
    "name": "GOBELET A SMOOTHIES 355 ML PETITS + COUVERCLE DOME 50 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0288",
    "reference": "0288",
    "name": "SEL MER FIN LA TABLEE 1KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 2.25,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0444",
    "reference": "0444",
    "name": "SAC POMME DE TERRE 10KG",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0080",
    "reference": "0080",
    "name": "TORTILLAS ANTALYA 18PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.49,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0255",
    "reference": "0255",
    "name": "SAUCE FROMAGERE FRAICHE 1.75L",
    "category": "reserve_seche",
    "defaultUnit": "COL",
    "unitPriceEstimate": 34.72,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0181",
    "reference": "0181",
    "name": "REBLOCHON IQF 500G",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 8.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0264",
    "reference": "0264",
    "name": "TRANCHE RACLETTE IQF 500G",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0246",
    "reference": "0246",
    "name": "POIVRON ROUGE VERT IQF 2,5KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.25,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0398",
    "reference": "0398",
    "name": "BOITE PIZZA T26 100 pcs",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": false
  },
  {
    "id": "prod_0221",
    "reference": "0221",
    "name": "FANTA CITRON 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0083",
    "reference": "0083",
    "name": "BACON DE DINDE IKBAL /KG ( POID A AJUSTER )",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 20.75,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0017",
    "reference": "0017",
    "name": "TARTE ALMONDY SAVEUR DAIM 1KG IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0408",
    "reference": "0408",
    "name": "COCKTAIL FRUIT MER 1KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0560",
    "reference": "0560",
    "name": "MERGUEZ PRECUITE TRANCHEE HALAL NORMIVAL 1KG IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.5,
    "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": false
  },
  {
    "id": "prod_0922",
    "reference": "0922",
    "name": "SACHET PANINI / SANDWICH BLANC 1000PCS",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 15.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0176",
    "reference": "0176",
    "name": "BOURSIN AFH LFR 1KG FRAIS",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0108",
    "reference": "0108",
    "name": "ANDALOUSE STICK COLONA 500PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 23.51,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0135",
    "reference": "0135",
    "name": "COCA COLA CHERRY 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0106",
    "reference": "0106",
    "name": "ALGERIENNE STICK COLONA 500PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 22.7,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0154",
    "reference": "0154",
    "name": "OASIS POMME POIRE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.414,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0122",
    "reference": "0122",
    "name": "SAUCE CHEDDAR DAIRYMAID 1L FRAICHE",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0285",
    "reference": "0285",
    "name": "DAIM BRISURE 1KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.28,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0430",
    "reference": "0430",
    "name": "ROUGE DE DINDE FRAIS 2,5 KG ID HALAL FRAIS",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.557,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0443",
    "reference": "0443",
    "name": "SAUCE ALGERIENNE 5KG FACTORY",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0765",
    "reference": "0765",
    "name": "POMME DE TERRE CUBE ROCAL 2KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 3.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0055",
    "reference": "0055",
    "name": "SAUCE MAYONNAISE DORO 5L",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0863",
    "reference": "0863",
    "name": "LE CHARCUTIER CHORIZO 800G ACHAHADA",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.3,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0861",
    "reference": "0861",
    "name": "BOITE PIZZA T40 50 pcs",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": false
  },
  {
    "id": "prod_0098",
    "reference": "0098",
    "name": "CREME LIQUIDE PRESIDENT 1L x 6",
    "category": "chambre_froide",
    "defaultUnit": "COL",
    "unitPriceEstimate": 20.9,
    "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0556",
    "reference": "0556",
    "name": "PITTA KEBAB STICK COLONA 500 pcs",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 22.7,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0194",
    "reference": "0194",
    "name": "SALADE ICEBERG (prix au cours)",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 0.95,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0225",
    "reference": "0225",
    "name": "SAC KRAFT BRUN 28X17X29 CM 250 PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 16,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0925",
    "reference": "0925",
    "name": "SAC PLASTIQUE 250 + 120 X 450 2000PCS",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 24,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0290",
    "reference": "0290",
    "name": "SEL FIN COLIS (0,8G*2000)",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 5.7,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0003",
    "reference": "0003",
    "name": "PANINI 115G - 25CM x 60PCS IQF",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 15.4,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0432",
    "reference": "0432",
    "name": "SAUCE BARBECUE 5 KG FACTORY",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.1,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0433",
    "reference": "0433",
    "name": "SAUCE BIGGY 5KG FACTORY",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.9,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0994",
    "reference": "0994",
    "name": "HUILE DE Tournesol - 10 L MAUREL",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 18,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0296",
    "reference": "0296",
    "name": "CORDON VOLAILLE ID HALAL 5KG",
    "category": "congelateur",
    "defaultUnit": "U",
    "unitPriceEstimate": 24,
    "image": "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3
    ],
    "popular": false
  },
  {
    "id": "prod_0531",
    "reference": "0531",
    "name": "LIPTON ICE TEA PASTHEQUE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.4,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0138",
    "reference": "0138",
    "name": "LIPTON ICE TEA PECHE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0325",
    "reference": "0325",
    "name": "PEPSI 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0141",
    "reference": "0141",
    "name": "PERRIER 33CL 24PCS",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.17,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0172",
    "reference": "0172",
    "name": "TROPICO 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0006",
    "reference": "0006",
    "name": "SAC POUBELLE 130L NOIR 1 PCS*10",
    "category": "emballages",
    "defaultUnit": "COL",
    "unitPriceEstimate": 16.5,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0245",
    "reference": "0245",
    "name": "FROMAGE PARMESAN RAPÉ GRANA PADANO 1KG FRAIS",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 14.6,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0308",
    "reference": "0308",
    "name": "OASIS FRAISE FRAMBOISE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0263",
    "reference": "0263",
    "name": "CUBES DE BLEU SURGELÉS IQF 750G",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 11.5,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0174",
    "reference": "0174",
    "name": "7UP CHERRY 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 13.5,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0104",
    "reference": "0104",
    "name": "BIG BURGER STICK COLONA 500PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 21.99,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0113",
    "reference": "0113",
    "name": "HUILE PIMENTEE EXTRA FORTE COLONA 3 ML 1000 PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 21,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0191",
    "reference": "0191",
    "name": "SEMOULE EXTRA FINE RENARD 5KG",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 7.49,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0158",
    "reference": "0158",
    "name": "CAPRI SUN MULTIVITAMINE 10PCS",
    "category": "boissons",
    "defaultUnit": "COL",
    "unitPriceEstimate": 12.89,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0231",
    "reference": "0231",
    "name": "COCA 1L5/6",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 8.1,
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0152",
    "reference": "0152",
    "name": "CRISTALINE 1L5/6",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 1.29,
    "image": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0139",
    "reference": "0139",
    "name": "LIPTON ICE TEA PECHE 33CL/24",
    "category": "boissons",
    "defaultUnit": "U",
    "unitPriceEstimate": 12.99,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0306",
    "reference": "0306",
    "name": "ECO BOX SANDWICH BLANC 200 PCS",
    "category": "reserve_seche",
    "defaultUnit": "U",
    "unitPriceEstimate": 15,
    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  },
  {
    "id": "prod_0014",
    "reference": "0014",
    "name": "MOZZARELLA STICKS LAMBWESTON 1KG",
    "category": "chambre_froide",
    "defaultUnit": "U",
    "unitPriceEstimate": 10.9,
    "image": "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2,
      3,
      4
    ],
    "popular": false
  },
  {
    "id": "prod_0132",
    "reference": "0132",
    "name": "GALETTES PDT\" LAMBWESTON\" SACHET 2.5 KG",
    "category": "emballages",
    "defaultUnit": "U",
    "unitPriceEstimate": 6.9,
    "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    "presets": [
      1,
      2
    ],
    "popular": false
  }
];
