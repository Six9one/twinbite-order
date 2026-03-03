import { useEffect, useState } from 'react';
import { useSpinWheel, PRIZES } from '@/hooks/useSpinWheel';

const SpinWheel = () => {
  const {
    state, selectedPrize, prizeCode, clientName, expiresAt, rotation,
    submitName, openGoogleReview, reviewDone, spin,
  } = useSpinWheel();

  const [nameVal, setNameVal] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Prize expiration countdown
  useEffect(() => {
    if (!expiresAt || state !== 'prize-display') return;
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('EXPIRÉ'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, state]);

  // Confetti on win
  useEffect(() => {
    if (state === 'prize-display') {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Build conic gradient
  const segAngle = 360 / PRIZES.length;
  const conic = PRIZES.map((p, i) => `${p.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`).join(', ');

  // Segment labels
  const Labels = () => (
    <>
      {PRIZES.map((p, i) => (
        <div key={i} className="sw-label" style={{ transform: `rotate(${i * segAngle + segAngle / 2 - 90}deg)` }}>
          <span className="sw-label-txt">{p.emoji}<br />{p.name}</span>
        </div>
      ))}
    </>
  );

  if (state === 'loading') return (
    <div className="sw"><div className="sw-loader"><div className="sw-spinner" /></div><style>{CSS}</style></div>
  );

  return (
    <div className="sw">
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="sw-hdr">
        <img src="/favicon.png" alt="Twin Pizza" className="sw-logo" />
        <span className="sw-brand">Twin Pizza</span>
      </div>

      {/* =================== NAME INPUT =================== */}
      {state === 'name-input' && (
        <div className="sw-body fade-in">
          <div className="sw-icon">👋</div>
          <h2 className="sw-h2">Bienvenue !</h2>
          <p className="sw-p">Entrez votre prénom pour participer :</p>
          <form className="sw-form" onSubmit={e => { e.preventDefault(); if (nameVal.trim()) submitName(nameVal.trim()); }}>
            <input className="sw-input" placeholder="Votre prénom..." value={nameVal} onChange={e => setNameVal(e.target.value)} autoFocus required />
            <button className="sw-btn" type="submit" disabled={!nameVal.trim()}>Continuer ➜</button>
          </form>
        </div>
      )}

      {/* =================== GOOGLE REVIEW =================== */}
      {state === 'google-review' && (
        <div className="sw-body fade-in">
          <div className="sw-icon">⭐</div>
          <h2 className="sw-h2">Laissez un avis !</h2>
          <p className="sw-p">Merci {clientName} ! Laissez-nous un avis Google pour débloquer la roue :</p>
          <button className="sw-btn sw-google" onClick={openGoogleReview}>⭐ Laisser un avis Google</button>
          <button className="sw-btn-link" onClick={reviewDone}>J'ai laissé mon avis ➜</button>
        </div>
      )}

      {/* =================== READY (show wheel + spin) =================== */}
      {state === 'ready' && (
        <div className="sw-body fade-in">
          <p className="sw-sub">🎡 Tournez la roue !</p>
          <div className="sw-wheel-wrap">
            <div className="sw-arrow">▼</div>
            <div className="sw-wheel" style={{ background: `conic-gradient(${conic})` }}><Labels /></div>
          </div>
          <button className="sw-btn" onClick={spin}>🎰 TOURNER</button>
        </div>
      )}

      {/* =================== SPINNING =================== */}
      {state === 'spinning' && (
        <div className="sw-body">
          <p className="sw-sub">🤞 Bonne chance !</p>
          <div className="sw-wheel-wrap">
            <div className="sw-arrow">▼</div>
            <div className="sw-wheel sw-spinning" style={{
              background: `conic-gradient(${conic})`,
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}><Labels /></div>
          </div>
        </div>
      )}

      {/* =================== PRIZE DISPLAY =================== */}
      {state === 'prize-display' && (
        <div className="sw-body fade-in">
          <div className="sw-card">
            <div className="sw-badge">🎁 GAGNÉ</div>
            <div className="sw-big-emoji">{selectedPrize?.emoji}</div>
            <h2 className="sw-prize-name">{selectedPrize?.name}</h2>
            <div className="sw-row"><span className="sw-lbl">Client</span><span className="sw-val">{clientName}</span></div>
            <div className="sw-row"><span className="sw-lbl">Code</span><span className="sw-code">{prizeCode}</span></div>
            <div className="sw-row"><span className="sw-lbl">Expire dans</span><span className={`sw-timer ${timeLeft === 'EXPIRÉ' ? 'sw-expired' : ''}`}>{timeLeft || '15:00'}</span></div>
            <div className="sw-show">📱 Montrez cet écran à la caisse</div>
          </div>
        </div>
      )}

      {/* =================== LOST =================== */}
      {state === 'lost' && (
        <div className="sw-body fade-in">
          <div className="sw-icon">😢</div>
          <h2 className="sw-h2 sw-dim">Pas de chance !</h2>
          <p className="sw-p">Revenez demain pour retenter votre chance !</p>
        </div>
      )}

      {/* =================== ALREADY PLAYED =================== */}
      {state === 'already-played' && (
        <div className="sw-body fade-in">
          <div className="sw-icon">⏰</div>
          <h2 className="sw-h2">Déjà joué !</h2>
          <p className="sw-p">Revenez demain pour retenter votre chance !</p>
        </div>
      )}

      <div className="sw-foot">Twin Pizza — Grand-Couronne</div>
      <style>{CSS}</style>
    </div>
  );
};

/* ============ CONFETTI ============ */
const Confetti = () => {
  const p = Array.from({ length: 40 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 2,
    dur: 2 + Math.random() * 2, size: 5 + Math.random() * 7,
    color: ['#f97316', '#dc2626', '#10b981', '#3b82f6', '#fbbf24', '#ec4899'][Math.floor(Math.random() * 6)],
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {p.map(c => <div key={c.id} className="conf-p" style={{
        left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`,
        backgroundColor: c.color, width: `${c.size}px`, height: `${c.size * 0.6}px`,
      }} />)}
    </div>
  );
};

/* ============ ALL CSS ============ */
const CSS = `
/* Reset for this page */
.sw { margin: 0; padding: 0; box-sizing: border-box; }
.sw *, .sw *::before, .sw *::after { box-sizing: border-box; margin: 0; padding: 0; }

.sw {
  min-height: 100vh; min-height: 100dvh;
  width: 100%; max-width: 100vw; overflow-x: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex; flex-direction: column; align-items: center;
  font-family: 'Comfortaa', sans-serif; color: #fff;
}

/* Header */
.sw-hdr {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 16px 0; width: 100%;
  justify-content: center;
}
.sw-logo { width: 40px; height: 40px; border-radius: 10px; }
.sw-brand {
  font-size: 1.25rem; font-weight: 700;
  background: linear-gradient(135deg, #f97316, #fbbf24);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* Body */
.sw-body {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 16px; width: 100%; max-width: 380px; gap: 14px;
}

/* Typography */
.sw-h2 { font-size: 1.4rem; font-weight: 700; text-align: center; }
.sw-sub { font-size: 1.2rem; font-weight: 700; text-align: center; }
.sw-p { color: rgba(255,255,255,.7); text-align: center; font-size: .9rem; line-height: 1.5; }
.sw-dim { color: rgba(255,255,255,.6); }
.sw-icon { font-size: 3rem; animation: pop .5s ease-out; }

@keyframes pop {
  0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); }
}

/* Form */
.sw-form { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.sw-input {
  background: rgba(255,255,255,.08); border: 2px solid rgba(249,115,22,.4);
  border-radius: 14px; padding: 14px 16px; font-size: 1rem; color: #fff;
  font-family: inherit; outline: none; width: 100%;
}
.sw-input::placeholder { color: rgba(255,255,255,.35); }
.sw-input:focus { border-color: #f97316; }

/* Buttons */
.sw-btn {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; border: none; padding: 14px 24px; border-radius: 50px;
  font-size: 1rem; font-weight: 700; font-family: inherit;
  cursor: pointer; width: 100%; text-transform: uppercase; letter-spacing: .5px;
  box-shadow: 0 4px 16px rgba(249,115,22,.35);
}
.sw-btn:disabled { opacity: .4; cursor: default; }
.sw-btn.sw-google {
  background: linear-gradient(135deg, #4285f4, #1a73e8);
  box-shadow: 0 4px 16px rgba(66,133,244,.35);
}
.sw-btn-link {
  background: none; border: none; color: rgba(255,255,255,.5);
  font-family: inherit; font-size: .85rem; cursor: pointer;
  text-decoration: underline; padding: 8px;
}

/* ===== WHEEL ===== */
.sw-wheel-wrap {
  position: relative; width: 280px; height: 280px; margin: 4px 0;
}
.sw-arrow {
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
  font-size: 1.6rem; color: #f97316; z-index: 5;
  filter: drop-shadow(0 2px 6px rgba(249,115,22,.5));
  animation: bounce-arrow .8s ease-in-out infinite;
}
@keyframes bounce-arrow {
  0%,100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(3px); }
}

.sw-wheel {
  width: 280px; height: 280px; border-radius: 50%; position: relative;
  border: 4px solid rgba(249,115,22,.6);
  box-shadow: 0 0 20px rgba(249,115,22,.25);
}
.sw-wheel::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border: 2px solid #fff; z-index: 3;
}

.sw-label {
  position: absolute; top: 0; left: 50%; width: 0; height: 50%;
  transform-origin: bottom center;
}
.sw-label-txt {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
  font-size: .5rem; font-weight: 700; color: #fff; text-align: center;
  text-shadow: 0 1px 2px rgba(0,0,0,.6); line-height: 1.15;
  white-space: nowrap; pointer-events: none;
}

/* ===== PRIZE CARD ===== */
.sw-card {
  background: rgba(249,115,22,.1); border: 2px solid rgba(249,115,22,.35);
  border-radius: 20px; padding: 24px 20px; width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  position: relative;
}
.sw-badge {
  position: absolute; top: -12px;
  background: linear-gradient(135deg, #f97316, #ea580c); color: #fff;
  padding: 4px 16px; border-radius: 50px; font-size: .7rem;
  font-weight: 700; letter-spacing: .5px;
}
.sw-big-emoji { font-size: 2.8rem; margin-top: 8px; }
.sw-prize-name { font-size: 1.2rem; font-weight: 700; color: #fbbf24; text-align: center; }
.sw-row { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; }
.sw-lbl { font-size: .65rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .5px; }
.sw-val { font-size: 1.1rem; font-weight: 600; }
.sw-code {
  font-size: 1.8rem; font-weight: 700; letter-spacing: 5px; color: #fbbf24;
  background: rgba(0,0,0,.25); padding: 6px 18px; border-radius: 10px;
  font-family: monospace;
}
.sw-timer { font-size: 1.5rem; font-weight: 700; color: #10b981; }
.sw-expired { color: #ef4444; animation: blink 1s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.sw-show {
  font-size: .9rem; font-weight: 600; text-align: center;
  padding: 10px 14px; background: rgba(16,185,129,.12);
  border-radius: 10px; border: 1px solid rgba(16,185,129,.25); width: 100%;
}

/* Footer */
.sw-foot { padding: 12px; text-align: center; color: rgba(255,255,255,.25); font-size: .7rem; }

/* Loader */
.sw-loader { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.sw-spinner {
  width: 40px; height: 40px; border: 3px solid rgba(249,115,22,.2);
  border-top-color: #f97316; border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Confetti */
.confetti { position: fixed; inset: 0; pointer-events: none; z-index: 99; overflow: hidden; }
.conf-p { position: absolute; top: -10px; border-radius: 2px; animation: fall linear forwards; }
@keyframes fall {
  0% { transform: translateY(0) rotate(0); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* Fade in */
.fade-in { animation: fi .4s ease-out; }
@keyframes fi { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

/* Small phones */
@media (max-width: 340px) {
  .sw-wheel-wrap, .sw-wheel { width: 240px; height: 240px; }
  .sw-h2 { font-size: 1.2rem; }
  .sw-big-emoji { font-size: 2.2rem; }
  .sw-code { font-size: 1.4rem; letter-spacing: 3px; }
}
@media (max-height: 650px) {
  .sw-wheel-wrap, .sw-wheel { width: 220px; height: 220px; }
  .sw-body { gap: 8px; padding: 10px; }
}
`;

export default SpinWheel;
