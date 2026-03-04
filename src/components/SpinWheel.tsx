import { useState, useCallback, useRef } from 'react';

// ============================================
// SPIN WHEEL COMPONENT
// Matches the reference model: 8 segments,
// dark border ring, pegs, pointer, pedestal
// ============================================

export interface SpinSegment {
    label: string;
    color: string;
}

interface SpinWheelProps {
    segments?: SpinSegment[];
    onResult?: (segment: SpinSegment & { index: number }) => void;
    size?: number;
    disabled?: boolean;
    spinButtonLabel?: string;
}

const DEFAULT_SEGMENTS: SpinSegment[] = [
    { label: '🍕', color: '#EA4335' },
    { label: '🎁', color: '#F9AB00' },
    { label: '🥤', color: '#34A853' },
    { label: '⭐', color: '#4285F4' },
    { label: '🍟', color: '#EA4335' },
    { label: '💰', color: '#F9AB00' },
    { label: '🎉', color: '#0F9D58' },
    { label: '🔥', color: '#4285F4' },
];

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCart(cx, cy, r, endAngle);
    const end = polarToCart(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function SpinWheel({
    segments = DEFAULT_SEGMENTS,
    onResult,
    size = 320,
    disabled = false,
    spinButtonLabel = 'TOURNER!',
}: SpinWheelProps) {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<(SpinSegment & { index: number }) | null>(null);
    const currentRotationRef = useRef(0);

    const numSegments = segments.length;
    const segmentAngle = 360 / numSegments;

    // SVG viewBox dimensions
    const vb = 400;
    const cx = vb / 2;
    const cy = vb / 2;
    const outerR = 170;
    const borderWidth = 18;
    const innerR = outerR - borderWidth;
    const hubR = 18;
    const pegR = 6;

    const handleSpin = useCallback(() => {
        if (isSpinning || disabled) return;

        setResult(null);
        setIsSpinning(true);

        const fullRotations = 5 + Math.floor(Math.random() * 6);
        const randomAngle = Math.random() * 360;
        const totalSpin = fullRotations * 360 + randomAngle;
        const newRotation = currentRotationRef.current + totalSpin;

        setRotation(newRotation);
        currentRotationRef.current = newRotation;

        const effectiveAngle = ((newRotation % 360) + 360) % 360;
        const winningIndex = Math.floor(effectiveAngle / segmentAngle) % numSegments;

        setTimeout(() => {
            const winner = { ...segments[winningIndex], index: winningIndex };
            setResult(winner);
            setIsSpinning(false);
            onResult?.(winner);
        }, 5000);
    }, [isSpinning, disabled, segments, segmentAngle, numSegments, onResult]);

    return (
        <div className="flex flex-col items-center gap-6" style={{ width: size }}>
            <div className="relative" style={{ width: size, height: size + size * 0.12 }}>
                <svg
                    viewBox={`0 0 ${vb} ${vb + 50}`}
                    width={size}
                    height={size + size * 0.12}
                    className="select-none"
                >
                    {/* Pedestal */}
                    <polygon
                        points={`${cx - 35},${cy + outerR + 10} ${cx + 35},${cy + outerR + 10} ${cx + 25},${cy + outerR + 48} ${cx - 25},${cy + outerR + 48}`}
                        fill="#37474F"
                    />
                    <rect
                        x={cx - 32}
                        y={cy + outerR + 5}
                        width={64}
                        height={8}
                        rx={3}
                        fill="#455A64"
                    />

                    {/* Outer dark ring */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={outerR}
                        fill="#37474F"
                        stroke="#263238"
                        strokeWidth={4}
                    />

                    {/* Spinning group */}
                    <g
                        style={{
                            transformOrigin: `${cx}px ${cy}px`,
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning
                                ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                                : 'none',
                        }}
                    >
                        {/* Colored segments */}
                        {segments.map((seg, i) => {
                            const startAngle = i * segmentAngle;
                            const endAngle = startAngle + segmentAngle;
                            const d = describeArc(cx, cy, innerR, startAngle, endAngle);
                            const labelAngle = startAngle + segmentAngle / 2;
                            const labelR = innerR * 0.62;
                            const labelPos = polarToCart(cx, cy, labelR, labelAngle);

                            return (
                                <g key={i}>
                                    <path d={d} fill={seg.color} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
                                    <text
                                        x={labelPos.x}
                                        y={labelPos.y}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fontSize={innerR * 0.18}
                                        className="pointer-events-none select-none"
                                    >
                                        {seg.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Segment divider lines */}
                        {segments.map((_, i) => {
                            const angle = i * segmentAngle;
                            const outerPt = polarToCart(cx, cy, innerR, angle);
                            return (
                                <line
                                    key={`line-${i}`}
                                    x1={cx}
                                    y1={cy}
                                    x2={outerPt.x}
                                    y2={outerPt.y}
                                    stroke="rgba(0,0,0,0.12)"
                                    strokeWidth={1.5}
                                />
                            );
                        })}

                        {/* Pegs on border */}
                        {segments.map((_, i) => {
                            const angle = i * segmentAngle;
                            const pegPos = polarToCart(cx, cy, outerR - borderWidth / 2 + 9, angle);
                            return (
                                <circle
                                    key={`peg-${i}`}
                                    cx={pegPos.x}
                                    cy={pegPos.y}
                                    r={pegR}
                                    fill="#CFD8DC"
                                    stroke="#90A4AE"
                                    strokeWidth={1}
                                />
                            );
                        })}

                        {/* Center hub */}
                        <circle cx={cx} cy={cy} r={hubR + 4} fill="#455A64" />
                        <circle cx={cx} cy={cy} r={hubR} fill="#37474F" />
                    </g>

                    {/* Pointer (does NOT rotate) */}
                    <polygon
                        points={`${cx},${cy - innerR + 18} ${cx - 16},${cy - outerR - 10} ${cx + 16},${cy - outerR - 10}`}
                        fill="#EA4335"
                        stroke="#C62828"
                        strokeWidth={2}
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Spin button */}
            <button
                onClick={handleSpin}
                disabled={isSpinning || disabled}
                className={`
                    w-full max-w-xs py-4 px-8 rounded-2xl text-xl font-extrabold uppercase tracking-wider
                    shadow-lg transition-all duration-200 select-none
                    ${isSpinning || disabled
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed scale-95'
                        : 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer'
                    }
                `}
            >
                {isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        En cours...
                    </span>
                ) : (
                    spinButtonLabel
                )}
            </button>

            {/* Result display */}
            {result && !isSpinning && (
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-5xl mb-2">{result.label}</div>
                    <p className="text-lg font-bold text-white">
                        Vous avez gagné !
                    </p>
                </div>
            )}
        </div>
    );
}

export default SpinWheel;
