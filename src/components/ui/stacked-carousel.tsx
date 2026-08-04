import * as React from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Compact drag-to-browse stacked card carousel (Framer Motion). Adapted from
 * a full-screen hero "destinations" demo into a small inline homepage strip:
 * card size, spacing, and responsive config were all scaled down so the
 * section stays short and every card fits within a phone screen with no
 * clipping. Tap the front card to select it (drag to browse first).
 */
export interface StackedCarouselItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

interface CarouselConfig {
  distanceDivisor: number;
  velocityDivisor: number;
  sensitivity: number;
  xMultiplier: number;
  yMultiplier: number;
  rotationMultiplier: number;
  scaleReduction: number;
}

const getCarouselConfig = (width: number): CarouselConfig => {
  if (width < 640) {
    return {
      distanceDivisor: 90,
      velocityDivisor: 450,
      sensitivity: 140,
      xMultiplier: 56,
      yMultiplier: 8,
      rotationMultiplier: 6,
      scaleReduction: 0.11,
    };
  }
  if (width < 1024) {
    return {
      distanceDivisor: 110,
      velocityDivisor: 550,
      sensitivity: 170,
      xMultiplier: 66,
      yMultiplier: 10,
      rotationMultiplier: 7,
      scaleReduction: 0.12,
    };
  }
  return {
    distanceDivisor: 130,
    velocityDivisor: 650,
    sensitivity: 190,
    xMultiplier: 76,
    yMultiplier: 12,
    rotationMultiplier: 8,
    scaleReduction: 0.13,
  };
};

interface StackedCarouselProps {
  items: StackedCarouselItem[];
  onSelect?: (item: StackedCarouselItem, index: number) => void;
  className?: string;
  cardClassName?: string;
  /** Auto-advance to the next card on a timer. Pauses while the user is dragging/tapping. */
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function StackedCarousel({
  items,
  onSelect,
  className,
  cardClassName,
  autoPlay = true,
  autoPlayInterval = 2600,
}: StackedCarouselProps) {
  const scrollProgress = useMotionValue(0);
  const startProgress = React.useRef(0);
  const isDraggingRef = React.useRef(false);
  const resumeAtRef = React.useRef(0);
  const [windowWidth, setWindowWidth] = React.useState(0);
  const total = items.length;

  React.useEffect(() => {
    setWindowWidth(window.innerWidth);
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const config = React.useMemo(() => getCarouselConfig(windowWidth), [windowWidth]);

  // Auto-advance one card at a time, skipping ticks while the user is
  // actively dragging or shortly after they last touched the carousel.
  React.useEffect(() => {
    if (!autoPlay || total <= 1) return;
    const id = setInterval(() => {
      if (isDraggingRef.current || Date.now() < resumeAtRef.current) return;
      const next = Math.round(scrollProgress.get()) + 1;
      animate(scrollProgress, next, { type: 'spring', stiffness: 200, damping: 30, mass: 1 });
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlay, autoPlayInterval, total, scrollProgress]);

  const pauseAutoPlay = () => {
    resumeAtRef.current = Date.now() + 3500;
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
    startProgress.current = scrollProgress.get();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = false;
    pauseAutoPlay();
    const dragDistance = info.offset.x;
    const velocity = info.velocity.x;
    const distanceShift = -dragDistance / config.distanceDivisor;
    const velocityShift = -velocity / config.velocityDivisor;
    let totalShift = Math.round(distanceShift + velocityShift);
    totalShift = Math.max(-3, Math.min(3, totalShift));
    const target = Math.round(startProgress.current) + totalShift;
    animate(scrollProgress, target, { type: 'spring', stiffness: 220, damping: 32, mass: 0.9 });
  };

  const handleTap = () => {
    pauseAutoPlay();
    const nearest = ((Math.round(scrollProgress.get()) % total) + total) % total;
    onSelect?.(items[nearest], nearest);
  };

  return (
    // `overflow-x-clip` keeps the fanned-out side cards from widening the page:
    // they are absolutely positioned well beyond the container's own width, and
    // without clipping they push the document's scrollWidth past the viewport,
    // which shows up as a horizontal scrollbar / sideways drift on narrow phones.
    // `clip` (rather than `hidden`) contains them without turning this into a
    // scroll container, so the sticky parents on the home page still pin.
    <div className={cn('relative w-full flex items-center justify-center select-none overflow-x-clip', className)}>
      {/* Transparent drag surface — onTap only fires for genuine taps (Framer
          Motion suppresses it once the pointer has moved past its drag threshold). */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragStart={handleDragStart}
        onDrag={(_, info) => {
          const delta = -info.delta.x / config.sensitivity;
          scrollProgress.set(scrollProgress.get() + delta);
        }}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
      />

      {items.map((item, i) => (
        <Card
          key={item.id}
          item={item}
          index={i}
          total={total}
          progress={scrollProgress}
          config={config}
          cardClassName={cardClassName}
        />
      ))}
    </div>
  );
}

interface CardProps {
  item: StackedCarouselItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  config: CarouselConfig;
  cardClassName?: string;
}

const Card = ({ item, index, total, progress, config, cardClassName }: CardProps) => {
  const offset = useTransform(progress, (p) => {
    let diff = (index - p) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  });

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : o * config.rotationMultiplier));
  const y = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : Math.abs(o) * config.yMultiplier));
  const scale = useTransform(offset, (o) => 1 - Math.abs(o) * config.scaleReduction);
  const opacity = useTransform(
    offset,
    [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2],
    [0, 1, 1, 1, 0]
  );
  const dimOverlay = useTransform(offset, [-2, -0.5, 0, 0.5, 2], [0.45, 0.18, 0, 0.18, 0.45]);
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10));
  const textOpacity = useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]);

  return (
    <motion.div
      style={{ x, rotate, y, scale, opacity, zIndex }}
      className={cn(
        'absolute rounded-2xl overflow-hidden bg-muted pointer-events-none shadow-lg',
        cardClassName
      )}
    >
      <img
        src={item.image}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <motion.div style={{ opacity: dimOverlay }} className="absolute inset-0 bg-black pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {item.badge}

      <motion.div style={{ opacity: textOpacity }} className="absolute bottom-0 left-0 w-full px-2 pb-2 text-white text-center">
        <p className="text-[12px] font-bold leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[11px] font-extrabold text-amber-300 leading-none mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {item.subtitle}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};
