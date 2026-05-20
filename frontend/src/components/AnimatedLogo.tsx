'use client';

export default function AnimatedLogo() {
  return (
    <>
      <style>{`
        .sb-logo {
          display: inline-flex;
          align-items: center;
          position: relative;
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
        }
        .sb-logo-silver { color: hsl(var(--foreground)); z-index: 2; }
        .sb-logo-bullet { color: hsl(var(--muted-foreground)); z-index: 2; }
        .sb-logo-bullet-wrapper {
          position: absolute;
          top: 50%;
          left: -100px;
          transform: translateY(-50%);
          z-index: 10;
          pointer-events: none;
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.8));
        }
        .sb-logo-trail {
          position: absolute;
          top: 50%;
          right: 100%;
          width: 50px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(226,232,240,0.8));
          transform: translateY(-50%);
        }
        .sb-logo .sb-logo-silver { animation: sbSplitLeft 5s infinite ease-out; }
        .sb-logo .sb-logo-bullet { animation: sbSplitRight 5s infinite ease-out; }
        .sb-logo .sb-logo-bullet-wrapper { animation: sbFireBullet 5s infinite cubic-bezier(0.5,0,1,0.5); }
        @keyframes sbFireBullet {
          0%   { left: -60px; opacity: 1; }
          10%  { left: 45%; opacity: 1; transform: translateY(-50%) scaleX(1.5); }
          15%  { left: 150%; opacity: 1; transform: translateY(-50%) scaleX(2); }
          16%  { opacity: 0; left: 150%; }
          100% { opacity: 0; left: 150%; }
        }
        @keyframes sbSplitLeft {
          0%,8%   { transform: translateX(0); }
          10%     { transform: translateX(-6px) skewX(-15deg); }
          13%     { transform: translateX(-3px) skewX(-5deg); text-shadow: -2px 0 5px rgba(255,255,255,0.5); }
          25%,100% { transform: translateX(0) skewX(0); text-shadow: none; }
        }
        @keyframes sbSplitRight {
          0%,8%   { transform: translateX(0); }
          10%     { transform: translateX(6px) skewX(15deg); color: hsl(var(--foreground)); text-shadow: 2px 0 5px rgba(255,255,255,0.8); }
          13%     { transform: translateX(3px) skewX(5deg); text-shadow: 0 0 15px rgba(255,255,255,0.3); }
          25%,100% { transform: translateX(0) skewX(0); color: hsl(var(--muted-foreground)); text-shadow: none; }
        }
      `}</style>
      <div className="sb-logo">
        <div className="sb-logo-silver">Silver</div>
        <div className="sb-logo-bullet-wrapper">
          <div className="sb-logo-trail"></div>
          <svg viewBox="0 0 100 20" width="40" height="8" className="block" >
            <defs>
              <linearGradient id="silverGloss" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="glowBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            <path d="M0,4 L80,4 Q100,4 100,10 Q100,16 80,16 L0,16 Z" fill="url(#silverGloss)" />
            <path d="M5,6 L75,6 Q90,6 90,10 Q90,14 75,14 L5,14 Z" fill="url(#glowBody)" opacity="0.6"/>
            <line x1="10" y1="10" x2="40" y2="10" stroke="#f8fafc" strokeWidth="1" opacity="0.8" />
          </svg>
        </div>
        <div className="sb-logo-bullet">Bullet</div>
      </div>
    </>
  );
}
