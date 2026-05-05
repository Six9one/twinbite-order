import { useStoreStatus } from '@/hooks/useSiteSettings';

export function ScrollingBanner() {
    const { status } = useStoreStatus();

    // Don't render if disabled or no text
    if (!status.scrollingBannerEnabled || !status.scrollingBannerText) {
        return null;
    }

    const bannerColor = status.scrollingBannerColor || '#dc2626';
    const bannerText = status.scrollingBannerText;

    return (
        <div
            className="scrolling-banner-wrapper"
            style={{ backgroundColor: bannerColor }}
        >
            <div className="scrolling-banner-track">
                {/* Repeat text multiple times for seamless infinite scroll */}
                {[...Array(4)].map((_, i) => (
                    <span key={i} className="scrolling-banner-item">
                        {bannerText}
                        <span className="scrolling-banner-separator">✦</span>
                    </span>
                ))}
            </div>

            <style>{`
                .scrolling-banner-wrapper {
                    width: 100%;
                    overflow: hidden;
                    position: relative;
                    z-index: 50;
                    padding: 8px 0;
                }

                .scrolling-banner-track {
                    display: inline-flex;
                    white-space: nowrap;
                    animation: scrollBannerLoop 20s linear infinite;
                    will-change: transform;
                }

                .scrolling-banner-item {
                    display: inline-block;
                    color: white;
                    font-weight: 700;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    padding: 0 40px;
                }

                .scrolling-banner-separator {
                    display: inline-block;
                    margin: 0 24px;
                    opacity: 0.7;
                    font-size: 10px;
                    vertical-align: middle;
                }

                @keyframes scrollBannerLoop {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                /* On smaller screens, slightly smaller text */
                @media (max-width: 640px) {
                    .scrolling-banner-item {
                        font-size: 12px;
                        padding: 0 24px;
                    }
                    .scrolling-banner-separator {
                        margin: 0 16px;
                    }
                }
            `}</style>
        </div>
    );
}
