import { useRef, useEffect, useState } from 'react';
import { useSpinWheel, PRIZES } from '@/hooks/useSpinWheel';

// ============================================================
// SPIN WHEEL PAGE — /avis
// Full-screen mobile-first experience for TwinPizza
// ============================================================

const SpinWheel = () => {
  const {
    state,
    selectedPrize,
    prizeCode,
    clientName,
    expiresAt,
    rotation,
    isLoading,
    spin,
    submitName,
    openGoogleReview,
    skipToPrize,
  } = useSpinWheel();

  const wheelRef = useRef<HTMLDivElement>(null);
  const [nameInput, setNameInput] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [reviewCountdown, setReviewCountdown] = useState(30);
  const [showConfetti, setShowConfetti] = useState(false);

  // Timer countdown for prize expiration
  useEffect(() => {
    if (!expiresAt || state !== 'prize-display') return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('EXPIRÉ');
        clearInterval(interval);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, state]);

  // Review countdown timer
  useEffect(() => {
    if (state !== 'reviewing') return;
    const interval = setInterval(() => {
      setReviewCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          skipToPrize();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, skipToPrize]);

  // Show confetti on win
  useEffect(() => {
    if (state === 'name-input' || state === 'prize-display') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Build conic-gradient segments
  const segmentAngle = 360 / PRIZES.length;
  const conicStops = PRIZES.map((prize, i) => {
    const start = i * segmentAngle;
    const end = start + segmentAngle;
    return `${prize.color} ${start}deg ${end}deg`;
  }).join(', ');

  if (isLoading) {
    return (
      <div className="spin-page">
        <div className="spin-loading">
          <div className="spin-loading-spinner" />
        </div>
        <style>{spinWheelStyles}</style>
      </div>
    );
  }

  return (
    <div className="spin-page">
      {showConfetti && <ConfettiEffect />}

      {/* Header */}
      <header className="spin-header">
        <img src="/favicon.png" alt="Twin Pizza" className="spin-logo" />
        <h1 className="spin-title">Twin Pizza</h1>
      </header>

      {/* READY STATE */}
      {state === 'ready' && (
        <div className="spin-content animate-fade-in">
          <p className="spin-subtitle">🎡 Tentez votre chance !</p>
          <p className="spin-description">Tournez la roue et gagnez un cadeau !</p>

          <div className="spin-wheel-container">
            <div className="spin-pointer">▼</div>
            <div className="spin-wheel" ref={wheelRef} style={{ background: `conic-gradient(${conicStops})` }}>
              {PRIZES.map((prize, i) => {
                const angle = i * segmentAngle + segmentAngle / 2 - 90;
                return (
                  <div key={i} className="spin-wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                    <span className="spin-wheel-label-text">
                      {prize.emoji}<br />{prize.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="spin-button" onClick={spin}>🎰 TOURNER LA ROUE</button>
        </div>
      )}

      {/* SPINNING STATE */}
      {state === 'spinning' && (
        <div className="spin-content">
          <p className="spin-subtitle">🎡 La roue tourne...</p>
          <p className="spin-description">C'est le moment de croiser les doigts ! 🤞</p>

          <div className="spin-wheel-container">
            <div className="spin-pointer">▼</div>
            <div
              className="spin-wheel"
              style={{
                background: `conic-gradient(${conicStops})`,
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
              }}
            >
              {PRIZES.map((prize, i) => {
                const angle = i * segmentAngle + segmentAngle / 2 - 90;
                return (
                  <div key={i} className="spin-wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                    <span className="spin-wheel-label-text">
                      {prize.emoji}<br />{prize.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LOST STATE */}
      {state === 'lost' && (
        <div className="spin-content animate-fade-in">
          <div className="spin-result-icon">😢</div>
          <h2 className="spin-result-title lost">Pas de chance !</h2>
          <p className="spin-description">
            Désolé, vous n'avez rien gagné cette fois.
            <br />Revenez demain pour retenter votre chance !
          </p>
          <div className="spin-emoji-row">😢 🍕 😢</div>
        </div>
      )}

      {/* NAME INPUT STATE */}
      {state === 'name-input' && (
        <div className="spin-content animate-fade-in">
          <div className="spin-result-icon">🎉</div>
          <h2 className="spin-result-title won">Félicitations !</h2>
          <p className="spin-win-prize">{selectedPrize?.emoji} {selectedPrize?.name}</p>
          <p className="spin-description">Entrez votre prénom pour récupérer votre lot :</p>
          <form
            className="spin-name-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (nameInput.trim()) submitName(nameInput.trim());
            }}
          >
            <input
              type="text"
              className="spin-name-input"
              placeholder="Votre prénom..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="spin-button" disabled={!nameInput.trim()}>
              Continuer ➜
            </button>
          </form>
        </div>
      )}

      {/* REVIEWING STATE */}
      {state === 'reviewing' && (
        <div className="spin-content animate-fade-in">
          <div className="spin-result-icon">⭐</div>
          <h2 className="spin-result-title">Une dernière étape !</h2>
          <p className="spin-description">Laissez-nous un avis Google pour récupérer votre cadeau :</p>
          <p className="spin-win-prize">{selectedPrize?.emoji} {selectedPrize?.name}</p>
          <button className="spin-button google-review" onClick={openGoogleReview}>
            ⭐ Laisser un avis Google
          </button>
          <div className="spin-review-countdown">
            <p>Votre lot s'affichera automatiquement dans</p>
            <span className="spin-countdown-number">{reviewCountdown}s</span>
          </div>
          <button className="spin-skip-button" onClick={skipToPrize}>
            J'ai déjà laissé mon avis →
          </button>
        </div>
      )}

      {/* PRIZE DISPLAY STATE */}
      {state === 'prize-display' && (
        <div className="spin-content animate-fade-in">
          <div className="spin-prize-card">
            <div className="spin-prize-badge">🎁 LOT GAGNÉ</div>
            <div className="spin-prize-emoji">{selectedPrize?.emoji}</div>
            <h2 className="spin-prize-name">{selectedPrize?.name}</h2>
            <div className="spin-prize-client">
              <span className="spin-prize-label">Client</span>
              <span className="spin-prize-value">{clientName}</span>
            </div>
            <div className="spin-prize-code-container">
              <span className="spin-prize-label">Code</span>
              <span className="spin-prize-code">{prizeCode}</span>
            </div>
            <div className="spin-prize-timer">
              <span className="spin-prize-label">Expire dans</span>
              <span className={`spin-prize-countdown ${timeLeft === 'EXPIRÉ' ? 'expired' : ''}`}>
                {timeLeft || '15:00'}
              </span>
            </div>
            <p className="spin-prize-instruction">📱 Montrez cet écran à la caisse</p>
          </div>
        </div>
      )}

      {/* ALREADY PLAYED STATE */}
      {state === 'already-played' && (
        <div className="spin-content animate-fade-in">
          <div className="spin-result-icon">⏰</div>
          <h2 className="spin-result-title">Déjà joué !</h2>
          <p className="spin-description">
            Vous avez déjà tourné la roue aujourd'hui.
            <br />Revenez demain pour retenter votre chance !
          </p>
          <div className="spin-emoji-row">🍕 ⏰ 🍕</div>
        </div>
      )}

      <footer className="spin-footer"><p>Twin Pizza — Grand-Couronne</p></footer>
      <style>{spinWheelStyles}</style>
    </div>
  );
};

// ============================================================
// CONFETTI
// ============================================================
const ConfettiEffect = () => {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#f97316', '#dc2626', '#10b981', '#3b82f6', '#fbbf24', '#ec4899'][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          backgroundColor: p.color,
          width: `${p.size}px`,
          height: `${p.size * 0.6}px`,
        }} />
      ))}
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================
const spinWheelStyles = `
  .spin-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-x: hidden;
    position: relative;
    font-family: 'Comfortaa', sans-serif;
    color: #ffffff;
  }

  .spin-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 24px 8px;
    z-index: 10;
  }
  .spin-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
  }
  .spin-title {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #f97316, #fbbf24);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .spin-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 24px;
    width: 100%;
    max-width: 420px;
    gap: 12px;
  }
  .spin-subtitle {
    font-size: 1.4rem;
    font-weight: 700;
    text-align: center;
    margin: 0;
  }
  .spin-description {
    color: rgba(255,255,255,0.7);
    text-align: center;
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }

  /* ===== WHEEL (conic-gradient) ===== */
  .spin-wheel-container {
    position: relative;
    margin: 8px 0;
    width: 300px;
    height: 300px;
  }
  .spin-pointer {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 2rem;
    color: #f97316;
    z-index: 10;
    filter: drop-shadow(0 2px 8px rgba(249, 115, 22, 0.5));
    animation: pointer-bounce 1s ease-in-out infinite;
  }
  @keyframes pointer-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(4px); }
  }

  .spin-wheel {
    width: 300px;
    height: 300px;
    border-radius: 50%;
    position: relative;
    border: 5px solid rgba(249, 115, 22, 0.7);
    box-shadow:
      0 0 30px rgba(249, 115, 22, 0.3),
      0 0 60px rgba(249, 115, 22, 0.1),
      inset 0 0 0 3px rgba(255,255,255,0.15);
    overflow: hidden;
  }

  /* Center dot */
  .spin-wheel::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f97316, #ea580c);
    border: 3px solid #fff;
    z-index: 5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .spin-wheel-label {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 50%;
    transform-origin: bottom center;
  }
  .spin-wheel-label-text {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.6rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;
  }

  /* ===== BUTTONS ===== */
  .spin-button {
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: white;
    border: none;
    padding: 16px 40px;
    border-radius: 50px;
    font-size: 1.15rem;
    font-weight: 700;
    font-family: 'Comfortaa', sans-serif;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 6px 24px rgba(249, 115, 22, 0.4);
    width: 100%;
    max-width: 320px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .spin-button:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(249,115,22,0.5); }
  .spin-button:active { transform: translateY(0); }
  .spin-button:disabled { opacity: 0.5; cursor: not-allowed; }
  .spin-button.google-review {
    background: linear-gradient(135deg, #4285f4, #1a73e8);
    box-shadow: 0 6px 24px rgba(66, 133, 244, 0.4);
  }

  /* ===== Results ===== */
  .spin-result-icon { font-size: 4rem; animation: result-bounce 0.6s ease-out; }
  @keyframes result-bounce {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
  .spin-result-title { font-size: 1.6rem; font-weight: 700; margin: 4px 0; text-align: center; }
  .spin-result-title.won {
    background: linear-gradient(135deg, #fbbf24, #f97316);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .spin-result-title.lost { color: rgba(255,255,255,0.7); }
  .spin-win-prize {
    font-size: 1.3rem; font-weight: 600; color: #fbbf24;
    text-align: center; padding: 8px 20px;
    background: rgba(249,115,22,0.15); border-radius: 12px;
    border: 1px solid rgba(249,115,22,0.3); margin: 4px 0;
  }
  .spin-emoji-row { font-size: 2.5rem; letter-spacing: 16px; margin-top: 16px; }

  /* ===== Name Input ===== */
  .spin-name-form { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 320px; margin-top: 8px; }
  .spin-name-input {
    background: rgba(255,255,255,0.1); border: 2px solid rgba(249,115,22,0.4);
    border-radius: 16px; padding: 14px 20px; font-size: 1.1rem; color: white;
    font-family: 'Comfortaa', sans-serif; outline: none; transition: border-color 0.3s;
    width: 100%; box-sizing: border-box;
  }
  .spin-name-input::placeholder { color: rgba(255,255,255,0.4); }
  .spin-name-input:focus { border-color: #f97316; box-shadow: 0 0 16px rgba(249,115,22,0.2); }

  /* ===== Review ===== */
  .spin-review-countdown { text-align: center; margin-top: 16px; color: rgba(255,255,255,0.6); font-size: 0.9rem; }
  .spin-countdown-number { display: block; font-size: 2rem; font-weight: 700; color: #fbbf24; margin-top: 4px; }
  .spin-skip-button {
    background: none; border: none; color: rgba(255,255,255,0.5);
    font-family: 'Comfortaa', sans-serif; font-size: 0.85rem;
    cursor: pointer; padding: 8px 16px; margin-top: 8px;
    text-decoration: underline; transition: color 0.3s;
  }
  .spin-skip-button:hover { color: rgba(255,255,255,0.8); }

  /* ===== Prize Card ===== */
  .spin-prize-card {
    background: linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.1));
    border: 2px solid rgba(249,115,22,0.4); border-radius: 24px;
    padding: 28px 24px; display: flex; flex-direction: column; align-items: center;
    gap: 12px; width: 100%; max-width: 340px; position: relative;
    box-shadow: 0 8px 32px rgba(249,115,22,0.2);
  }
  .spin-prize-badge {
    position: absolute; top: -14px;
    background: linear-gradient(135deg, #f97316, #ea580c); color: white;
    padding: 6px 20px; border-radius: 50px; font-size: 0.8rem;
    font-weight: 700; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(249,115,22,0.4);
  }
  .spin-prize-emoji { font-size: 3.5rem; margin-top: 8px; }
  .spin-prize-name { font-size: 1.4rem; font-weight: 700; color: #fbbf24; margin: 0; text-align: center; }
  .spin-prize-client, .spin-prize-code-container, .spin-prize-timer {
    display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%;
  }
  .spin-prize-label { font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
  .spin-prize-value { font-size: 1.2rem; font-weight: 600; }
  .spin-prize-code {
    font-size: 2.2rem; font-weight: 700; letter-spacing: 6px; color: #fbbf24;
    background: rgba(0,0,0,0.3); padding: 8px 24px; border-radius: 12px; font-family: monospace;
  }
  .spin-prize-countdown { font-size: 1.8rem; font-weight: 700; color: #10b981; }
  .spin-prize-countdown.expired { color: #ef4444; animation: pulse-expired 1s ease-in-out infinite; }
  @keyframes pulse-expired { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .spin-prize-instruction {
    margin-top: 8px; font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.9);
    text-align: center; padding: 12px 16px;
    background: rgba(16,185,129,0.15); border-radius: 12px;
    border: 1px solid rgba(16,185,129,0.3); width: 100%;
  }

  /* ===== Footer & Loading ===== */
  .spin-footer { padding: 16px; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.8rem; }
  .spin-loading { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .spin-loading-spinner {
    width: 48px; height: 48px; border: 4px solid rgba(249,115,22,0.2);
    border-top-color: #f97316; border-radius: 50%; animation: loading-spin 0.8s linear infinite;
  }
  @keyframes loading-spin { to { transform: rotate(360deg); } }

  /* ===== Confetti ===== */
  .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100; overflow: hidden; }
  .confetti-piece { position: absolute; top: -20px; border-radius: 2px; animation: confetti-fall linear forwards; }
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }

  /* ===== Fade In ===== */
  .animate-fade-in { animation: spin-fade-in 0.5s ease-out; }
  @keyframes spin-fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 340px) {
    .spin-wheel-container, .spin-wheel { width: 260px; height: 260px; }
  }
`;

export default SpinWheel;
