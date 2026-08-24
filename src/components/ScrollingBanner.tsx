import { useStoreStatus } from '@/hooks/useSiteSettings';

export function ScrollingBanner() {
    const { status } = useStoreStatus();

    if (!status.scrollingBannerEnabled || !status.scrollingBannerText) {
        return null;
    }

    const bannerColor = status.scrollingBannerColor || '#dc2626';
    // Duplicate text enough times to guarantee seamless looping
    const items = Array(6).fill(status.scrollingBannerText);

    return (
        <div
            style={{
                backgroundColor: bannerColor,
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 40,
                padding: '8px 0',
                flexShrink: 0,
            }}
        >
            <div style={{
                display: 'flex',
                whiteSpace: 'nowrap',
                animation: 'scrollBanner 24s linear infinite',
                willChange: 'transform',
            }}>
                {items.map((text, i) => (
                    <span
                        key={i}
                        style={{
                            display: 'inline-block',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '13px',
                            letterSpacing: '0.4px',
                            padding: '0 28px',
                            flexShrink: 0,
                        }}
                    >
                        {text}
                        <span style={{ margin: '0 20px', opacity: 0.6, fontSize: '10px', verticalAlign: 'middle' }}>✦</span>
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes scrollBanner {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
