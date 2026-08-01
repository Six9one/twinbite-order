import React from 'react';

interface GalleryItem {
  title: string;
  image: string;
  badge: string;
}

const galleryItems: GalleryItem[] = [
  {
    title: 'Twin Pizza',
    image: '/store-front.jpg',
    badge: '📍 Restaurant',
  },
  {
    title: 'Nos Pizzas',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80',
    badge: '🍕 Fait Maison',
  },
  {
    title: 'Tacos Généreux',
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=400&q=80',
    badge: '🌮 Gourmand',
  },
  {
    title: 'Milkshakes',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80',
    badge: '🥤 Frais',
  },
];

export function StoreGallery() {
  return (
    <section className="py-3">
      <div className="px-4 mb-2.5">
        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
          📸 Notre Restaurant
        </h3>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x scroll-smooth scrollbar-none px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {galleryItems.map((item, idx) => (
          <div
            key={idx}
            className="w-56 h-[140px] flex-shrink-0 snap-start rounded-2xl overflow-hidden relative shadow-sm border border-stone-200/50 bg-white/60 group"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {item.badge && (
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] font-semibold bg-black/50 text-white rounded-full backdrop-blur-md shadow-xs">
                {item.badge}
              </span>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-3 py-2 text-white rounded-b-2xl">
              <p className="text-xs font-semibold truncate">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
