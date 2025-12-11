import { MenuItem } from '@/types/order';

export const menuItems: MenuItem[] = [
  // Pizzas
  { id: 'pizza-1', name: 'Margherita', description: 'Tomate, mozzarella, basilic frais', price: 9.50, category: 'pizzas' },
  { id: 'pizza-2', name: 'Reine', description: 'Tomate, mozzarella, jambon, champignons', price: 11.00, category: 'pizzas' },
  { id: 'pizza-3', name: 'Quatre Fromages', description: 'Mozzarella, gorgonzola, chèvre, parmesan', price: 12.50, category: 'pizzas' },
  { id: 'pizza-4', name: 'Calzone', description: 'Pizza pliée, jambon, œuf, champignons', price: 12.00, category: 'pizzas' },
  { id: 'pizza-5', name: 'Orientale', description: 'Merguez, poivrons, oignons, olives', price: 11.50, category: 'pizzas' },

  // Soufflets
  { id: 'soufflet-1', name: 'Soufflet Personnalisé', description: 'Créez votre soufflet sur mesure', price: 7.50, category: 'soufflets' },

  // Makloub
  { id: 'makloub-1', name: 'Makloub Poulet', description: 'Poulet mariné, salade, tomates, sauce', price: 8.00, category: 'makloub' },
  { id: 'makloub-2', name: 'Makloub Viande', description: 'Viande hachée, salade, oignons, sauce', price: 8.50, category: 'makloub' },
  { id: 'makloub-3', name: 'Makloub Mixte', description: 'Poulet et viande, garniture complète', price: 9.50, category: 'makloub' },

  // Tacos
  { id: 'tacos-1', name: 'Tacos Simple', description: 'Une viande au choix, frites, sauce', price: 7.00, category: 'tacos' },
  { id: 'tacos-2', name: 'Tacos Double', description: 'Deux viandes, frites, fromage, sauce', price: 9.00, category: 'tacos' },
  { id: 'tacos-3', name: 'Tacos Triple', description: 'Trois viandes, frites, fromage, sauce', price: 11.00, category: 'tacos' },

  // Sandwiches
  { id: 'sandwich-1', name: 'Sandwich Poulet', description: 'Poulet grillé, crudités, sauce', price: 5.50, category: 'sandwiches' },
  { id: 'sandwich-2', name: 'Sandwich Kebab', description: 'Viande kebab, salade, sauce blanche', price: 6.00, category: 'sandwiches' },
  { id: 'sandwich-3', name: 'Sandwich Merguez', description: 'Merguez grillées, oignons, harissa', price: 5.50, category: 'sandwiches' },

  // Panini
  { id: 'panini-1', name: 'Panini Thon', description: 'Thon, fromage, tomates, olives', price: 5.00, category: 'panini' },
  { id: 'panini-2', name: 'Panini Poulet', description: 'Poulet, fromage fondu, sauce curry', price: 5.50, category: 'panini' },
  { id: 'panini-3', name: 'Panini Kebab', description: 'Viande kebab, fromage, sauce', price: 6.00, category: 'panini' },

  // Boissons
  { id: 'boisson-1', name: 'Coca-Cola', description: '33cl', price: 2.00, category: 'boissons' },
  { id: 'boisson-2', name: 'Fanta', description: '33cl', price: 2.00, category: 'boissons' },
  { id: 'boisson-3', name: 'Eau minérale', description: '50cl', price: 1.50, category: 'boissons' },
  { id: 'boisson-4', name: 'Jus d\'orange', description: '33cl', price: 2.50, category: 'boissons' },
];

export const souffletOptions = {
  meats: [
    { id: 'poulet', name: 'Poulet', price: 0 },
    { id: 'escalope', name: 'Escalope', price: 0.50 },
    { id: 'viande', name: 'Viande hachée', price: 0 },
    { id: 'merguez', name: 'Merguez', price: 0.50 },
    { id: 'mixte', name: 'Mixte', price: 1.00 },
  ],
  sauces: [
    { id: 'blanche', name: 'Sauce Blanche', price: 0 },
    { id: 'algerienne', name: 'Sauce Algérienne', price: 0 },
    { id: 'harissa', name: 'Harissa', price: 0 },
    { id: 'biggy', name: 'Sauce Biggy', price: 0 },
    { id: 'ketchup', name: 'Ketchup', price: 0 },
    { id: 'mayonnaise', name: 'Mayonnaise', price: 0 },
  ],
  toppings: [
    { id: 'pdt', name: 'Pommes de terre', price: 0 },
    { id: 'oignon', name: 'Oignons', price: 0 },
    { id: 'olive', name: 'Olives', price: 0.50 },
    { id: 'fromage', name: 'Fromage', price: 1.00 },
  ],
  sides: [
    { id: 'frites', name: 'Frites', price: 2.50 },
    { id: 'boisson', name: 'Boisson', price: 2.00 },
    { id: 'frites-boisson', name: 'Frites + Boisson', price: 4.00 },
    { id: 'rien', name: 'Rien', price: 0 },
  ],
};

export const categoryLabels: Record<string, string> = {
  pizzas: 'Pizzas',
  soufflets: 'Soufflets',
  makloub: 'Makloub',
  tacos: 'Tacos',
  sandwiches: 'Sandwiches',
  panini: 'Panini',
  boissons: 'Boissons',
};
