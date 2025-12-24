import { useState, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    /** Whether this image should load eagerly (for above-the-fold content) */
    eager?: boolean;
    /** Show a skeleton placeholder while loading */
    showSkeleton?: boolean;
    /** Container className for the wrapper div */
    containerClassName?: string;
}

export function OptimizedImage({
    src,
    alt,
    className,
    containerClassName,
    eager = false,
    showSkeleton = true,
    ...props
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div className={cn('relative overflow-hidden', containerClassName)}>
            {/* Skeleton placeholder */}
            {showSkeleton && !isLoaded && !hasError && (
                <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
            )}

            <img
                src={src}
                alt={alt || ''}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={eager ? 'high' : 'auto'}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={cn(
                    'transition-opacity duration-300',
                    isLoaded ? 'opacity-100' : 'opacity-0',
                    className
                )}
                {...props}
            />
        </div>
    );
}
