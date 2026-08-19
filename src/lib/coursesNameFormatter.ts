import { SupplierProduct } from '@/data/supplierCatalog';

// Clean, human-friendly names (1-3 words in Title Case)
export function getCleanDisplayName(rawName: string): string {
  if (!rawName) return '';
  const s = rawName.trim().toUpperCase();

  // 1. Exact / Partial Dictionary Mappings for French Kitchen / Pizzeria essentials
  if (s.includes('MOZZARELLA') && s.includes('CONTADORA')) return 'Mozzarella Contadora';
  if (s.includes('MOZZARELLA') && s.includes('MAESTRELLA')) return 'Mozzarella Maestrella';
  if (s.includes('MOZZARELLA')) return 'Mozzarella';
  if (s.includes('CHEDDAR')) return 'Cheddar Burger';
  if (s.includes('EMMENTAL')) return 'Emmental Râpé';
  if (s.includes('GOUDA')) return 'Gouda Tranché';
  if (s.includes('RACLETTE')) return 'Fromage Raclette';
  if (s.includes('REBLOCHON')) return 'Reblochon';
  if (s.includes('CHEVRE') || s.includes('CHÈVRE')) return 'Bûche de Chèvre';
  if (s.includes('BOURSIN')) return 'Boursin Cuisine';
  if (s.includes('ROQUEFORT') || s.includes('BLEU')) return 'Fromage Bleu';
  if (s.includes('PARMESAN') || s.includes('GRANA')) return 'Parmesan Grana';

  // Meats & Poultry
  if (s.includes('FILET') && s.includes('POULET')) return 'Filet de Poulet';
  if (s.includes('TENDERS')) return 'Tenders';
  if (s.includes('CORDON BLEU')) return 'Cordon Bleu';
  if (s.includes('MERGUEZ')) return 'Merguez';
  if (s.includes('ESCALOPE')) return 'Escalope de Dinde';
  if (s.includes('LAMELLES') && s.includes('POULET')) return 'Lamelles Poulet Kebab';
  if (s.includes('VIANDE') && s.includes('KEBAB')) return 'Viande Kebab';
  if (s.includes('EGRENEE') || s.includes('ÉGRENÉE') || s.includes('HACHEE') || s.includes('HACHÉ')) return 'Viande Hachée';
  if (s.includes('STEAK')) return 'Steaks Hachés';
  if (s.includes('NUGGETS')) return 'Nuggets';
  if (s.includes('WINGS')) return 'Chicken Wings';
  if (s.includes('BACON')) return 'Bacon de Dinde';
  if (s.includes('JAMBON') && s.includes('DINDE')) return 'Jambon de Dinde';
  if (s.includes('PEPPERONI')) return 'Pepperoni';
  if (s.includes('CHORIZO')) return 'Chorizo Volailles';
  if (s.includes('SALAMI')) return 'Salami Volailles';
  if (s.includes('LARDONS')) return 'Lardons Volailles';
  if (s.includes('JAMBON')) return 'Jambon';

  // Fries & Tex-Mex
  if (s.includes('FRITE') && (s.includes('9/9') || s.includes('BEN'))) return "Frites 9/9 Big Ben's";
  if (s.includes('FRITE') || s.includes('FRITES')) return 'Frites';
  if (s.includes('ONION RINGS') || s.includes('OIGNONS RINGS')) return 'Onion Rings';
  if (s.includes('JALAPENOS') || s.includes('JALAPEÑOS')) return 'Jalapeños Fromage';
  if (s.includes('MOZZA STICK') || s.includes('STICK')) return 'Mozza Sticks';
  if (s.includes('CAMEMBERT')) return 'Bouchées Camembert';
  if (s.includes('CRISPY') || (s.includes('OIGNON') && s.includes('FRIT'))) return 'Oignons Frits (Crispy)';

  // Sauces & Condiments
  if (s.includes('TOMATE') && s.includes('MUTTI')) return 'Sauce Tomate Mutti';
  if (s.includes('TOMATE') || s.includes('PULPE')) return 'Sauce Tomate';
  if (s.includes('ALGERIENNE') || s.includes('ALGÉRIENNE')) return 'Sauce Algérienne';
  if (s.includes('SAMOURAI') || s.includes('SAMOURAÏ')) return 'Sauce Samouraï';
  if (s.includes('BIGGY')) return 'Sauce Biggy Burger';
  if (s.includes('BURGER')) return 'Sauce Burger';
  if (s.includes('BLANCHE')) return 'Sauce Blanche';
  if (s.includes('BARBECUE') || s.includes('BBQ')) return 'Sauce Barbecue';
  if (s.includes('CHILI')) return 'Sauce Sweet Chili';
  if (s.includes('POIVRE')) return 'Sauce Poivre';
  if (s.includes('CURRY')) return 'Sauce Curry';
  if (s.includes('MAYONNAISE')) return 'Mayonnaise';
  if (s.includes('KETCHUP')) return 'Ketchup';
  if (s.includes('HARISSA')) return 'Harissa';
  if (s.includes('HUILE') && s.includes('OLIVE')) return "Huile d'Olive";
  if (s.includes('HUILE')) return 'Huile de Tournesol';
  if (s.includes('CREME') || s.includes('CRÈME')) return 'Crème Fraîche';

  // Bakery & Dough
  if (s.includes('PAIN KEBAB')) return 'Pain Kebab';
  if (s.includes('DURUM') || s.includes('GALETTE') || s.includes('TORTILLA')) return 'Galettes Durum';
  if (s.includes('FARINE')) return 'Farine';
  if (s.includes('LEVURE')) return 'Levure Fraîche';
  if (s.includes('SEL')) return 'Sel Fin';
  if (s.includes('SUCRE')) return 'Sucre';

  // Vegetables & Toppings
  if (s.includes('OLIVE') && s.includes('NOIRE')) return 'Olives Noires';
  if (s.includes('OLIVE') && s.includes('VERTE')) return 'Olives Vertes';
  if (s.includes('CHAMPIGNON')) return 'Champignons Frais';
  if (s.includes('POIVRON')) return 'Poivrons Lanières';
  if (s.includes('OIGNON') && s.includes('ROUGE')) return 'Oignons Rouges';
  if (s.includes('OIGNON')) return 'Oignons';
  if (s.includes('ANANAS')) return 'Ananas Morceaux';
  if (s.includes('CORNICHON')) return 'Cornichons Rondelles';

  // Packaging & Disposables
  if (s.includes('BOITE') && s.includes('T31')) return 'Boîtes Pizza T31';
  if (s.includes('BOITE') && s.includes('T40')) return 'Boîtes Pizza T40';
  if (s.includes('BOITE') && s.includes('T26')) return 'Boîtes Pizza T26';
  if (s.includes('BOITE') && s.includes('CALZONE')) return 'Boîtes Calzone';
  if (s.includes('BOITE') && s.includes('SANDWICH')) return 'Boîtes Sandwich Kraft';
  if (s.includes('SAC KRAFT') || s.includes('SAC PAPIER')) return 'Sacs Kraft';
  if (s.includes('SAC PLASTIQUE')) return 'Sacs Poignées';
  if (s.includes('SERVIETTE')) return 'Serviettes';
  if (s.includes('ALUMINIUM')) return 'Papier Aluminium';
  if (s.includes('FILM')) return 'Film Étirable';
  if (s.includes('GOBELET') || s.includes('PORTE-GOBELET')) return 'Porte-Gobelets';
  if (s.includes('POT') && s.includes('SAUCE')) return 'Pots à Sauce';
  if (s.includes('CUILLERE') || s.includes('CUILLÈRE')) return 'Cuillères Bois';
  if (s.includes('FOURCHETTE')) return 'Fourchettes Bois';
  if (s.includes('ROULEAU') || s.includes('CAISSE')) return 'Bobines Thermiques';

  // Drinks & Desserts
  if (s.includes('COCA') && s.includes('CHERRY')) return 'Coca-Cola Cherry';
  if (s.includes('COCA') && s.includes('ZERO')) return 'Coca-Cola Zéro';
  if (s.includes('COCA')) return 'Coca-Cola';
  if (s.includes('OASIS') && s.includes('TROPICAL')) return 'Oasis Tropical';
  if (s.includes('OASIS') && s.includes('POMME')) return 'Oasis Pomme Cassis';
  if (s.includes('OASIS')) return 'Oasis';
  if (s.includes('SCHWEPPES') && s.includes('AGRUM')) return 'Schweppes Agrumes';
  if (s.includes('SCHWEPPES')) return 'Schweppes';
  if (s.includes('FUZE') || s.includes('ICE TEA') || s.includes('LIPTON')) return 'Fuze Tea Pêche';
  if (s.includes('FANTA') && s.includes('CITRON')) return 'Fanta Citron';
  if (s.includes('FANTA')) return 'Fanta Orange';
  if (s.includes('7UP') || s.includes('SEVEN UP')) return '7Up Mojito';
  if (s.includes('ORANGINA')) return 'Orangina';
  if (s.includes('TROPICO')) return 'Tropico';
  if (s.includes('HAWAI') || s.includes('HAWAÏ')) return 'Hawaï Tropical';
  if (s.includes('POMS')) return 'Poms Pomme';
  if (s.includes('RED BULL')) return 'Red Bull';
  if (s.includes('CAPRI') || s.includes('CAPRI-SUN')) return 'Capri-Sun';
  if (s.includes('CRISTALINE')) return 'Eau Cristaline';
  if (s.includes('SAN PELLEGRINO')) return 'San Pellegrino';
  if (s.includes('PERRIER')) return 'Perrier';
  if (s.includes('TIRAMISU')) return 'Tiramisu';
  if (s.includes('DONUT') || s.includes('DONUTS')) return 'Donuts';
  if (s.includes('CARAMEL')) return 'Sauce Caramel Vahiné';
  if (s.includes('CHOCOLAT') || s.includes('NUTELLA')) return 'Chocolat Noisette';

  // 2. Generic Algorithmic Cleaner for any custom product
  let clean = rawName
    .replace(/\b(ACHAHADA|AVS|IQF|RAPE|RAPEE|FRAICHE|FRAIS|SURGELE|SURGELEE|SOUS VIDE|PRE DECOUPE|PRECUIT|IMPRIMEE|NEUTRE|BARQUETTE|CARTON|SACHET|PACK|BOITE|COLIS|STANDARD|PREMIUM|EXTRA|SEAU|BIDON|TUBE|BT|CL|ML|KG|G|MM|CM|PCS|PCES)\b/gi, '')
    .replace(/\d+(\.\d+)?\s*(KG|G|L|CL|ML|X\d+|MM|CM|T\d+)/gi, '')
    .replace(/[^a-zA-ZÀ-ÿ0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Title Case (1 to 3 words)
  const words = clean.split(' ').filter(Boolean).slice(0, 3);
  if (words.length > 0) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  return rawName.slice(0, 24);
}

export interface FoodCategoryChip {
  id: string;
  label: string;
}

export const FOOD_CATEGORY_CHIPS: FoodCategoryChip[] = [
  { id: 'all', label: 'Tous' },
  { id: 'viandes', label: '🥩 Viandes & Volaille' },
  { id: 'fromages', label: '🧀 Fromages & Crème' },
  { id: 'surgeles', label: '🍟 Frites & Surgelés' },
  { id: 'sauces', label: '🥫 Sauces & Épicerie' },
  { id: 'pains', label: '🍞 Pains & Pâtes' },
  { id: 'emballages', label: '🍕 Emballages & Sacs' },
  { id: 'boissons', label: '🥤 Boissons & Eaux' },
  { id: 'legumes', label: '🥗 Légumes & Garnitures' },
];

export function getProductFoodCategory(product: SupplierProduct): string {
  const s = (product.name + ' ' + (product.category || '')).toUpperCase();

  if (
    s.includes('POULET') || s.includes('TENDERS') || s.includes('CORDON BLEU') ||
    s.includes('MERGUEZ') || s.includes('ESCALOPE') || s.includes('KEBAB') ||
    s.includes('STEAK') || s.includes('NUGGETS') || s.includes('WINGS') ||
    s.includes('BACON') || s.includes('JAMBON') || s.includes('PEPPERONI') ||
    s.includes('CHORIZO') || s.includes('SALAMI') || s.includes('LARDON') ||
    s.includes('CHARCUTIER') || s.includes('VIANDE')
  ) {
    return 'viandes';
  }

  if (
    s.includes('MOZZARELLA') || s.includes('CHEDDAR') || s.includes('EMMENTAL') ||
    s.includes('GOUDA') || s.includes('RACLETTE') || s.includes('REBLOCHON') ||
    s.includes('CHEVRE') || s.includes('CHÈVRE') || s.includes('BOURSIN') ||
    s.includes('ROQUEFORT') || s.includes('BLEU') || s.includes('PARMESAN') ||
    s.includes('FROMAGE') || s.includes('CREME') || s.includes('CRÈME')
  ) {
    return 'fromages';
  }

  if (
    s.includes('FRITE') || s.includes('TEXMEX') || s.includes('TEX-MEX') ||
    s.includes('ONION') || s.includes('JALAPENO') || s.includes('STICK') ||
    s.includes('CAMEMBERT') || s.includes('SURGELE') || s.includes('CONGELATEUR')
  ) {
    return 'surgeles';
  }

  if (
    s.includes('SAUCE') || s.includes('MAYONNAISE') || s.includes('KETCHUP') ||
    s.includes('HARISSA') || s.includes('HUILE') || s.includes('TOMATE') ||
    s.includes('PULPE') || s.includes('SEL') || s.includes('SUCRE') ||
    s.includes('EPICERIE') || s.includes('ÉPICERIE') || s.includes('RESERVE_SECHE')
  ) {
    return 'sauces';
  }

  if (
    s.includes('PAIN') || s.includes('DURUM') || s.includes('GALETTE') ||
    s.includes('TORTILLA') || s.includes('FARINE') || s.includes('LEVURE')
  ) {
    return 'pains';
  }

  if (
    s.includes('BOITE') || s.includes('BOÎTE') || s.includes('SAC') ||
    s.includes('SERVIETTE') || s.includes('ALUMINIUM') || s.includes('FILM') ||
    s.includes('GOBELET') || s.includes('POT') || s.includes('CUILLERE') ||
    s.includes('FOURCHETTE') || s.includes('EMBALLAGE') || s.includes('BOBINE')
  ) {
    return 'emballages';
  }

  if (
    s.includes('COCA') || s.includes('OASIS') || s.includes('SCHWEPPES') ||
    s.includes('TEA') || s.includes('FANTA') || s.includes('7UP') ||
    s.includes('ORANGINA') || s.includes('TROPICO') || s.includes('HAWAI') ||
    s.includes('POMS') || s.includes('BULL') || s.includes('CAPRI') ||
    s.includes('CRISTALINE') || s.includes('EAU') || s.includes('PERRIER') ||
    s.includes('BOISSON')
  ) {
    return 'boissons';
  }

  if (
    s.includes('OLIVE') || s.includes('CHAMPIGNON') || s.includes('POIVRON') ||
    s.includes('OIGNON') || s.includes('ANANAS') || s.includes('CORNICHON') ||
    s.includes('SALADE')
  ) {
    return 'legumes';
  }

  return 'sauces';
}
