import React from 'react';

export function DoneLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]"
      >
        <rect
          x="3"
          y="3"
          width="38"
          height="38"
          rx="10"
          className="fill-[#0d0d0f] stroke-[#26262a]"
          strokeWidth="1.5"
        />
        
        {/* Subtle geometric grid accents */}
        <line x1="3" y1="22" x2="41" y2="22" stroke="#1f1f23" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="22" y1="3" x2="22" y2="41" stroke="#1f1f23" strokeWidth="1" strokeDasharray="2 3" />

        {/* Outer subtle shield bevel with violet glow */}
        <polygon
          points="22,7 35,14.5 35,29.5 22,37 9,29.5 9,14.5"
          fill="rgba(20,20,22,0.85)"
          stroke="url(#shieldEdgeGrad)"
          strokeWidth="1.2"
        />

        {/* Dynamic Settled Slash & Check in vivid Violet */}
        <path
          d="M13 22.5L19.5 29L32 15"
          stroke="url(#doneNeonVioletGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center luminous violet pip */}
        <circle cx="19.5" cy="29" r="1.5" fill="#e9d5ff" />

        <defs>
          <linearGradient id="doneNeonVioletGrad" x1="12" y1="14" x2="33" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c084fc" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="shieldEdgeGrad" x1="9" y1="7" x2="35" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8b5cf6" stopOpacity="0.7" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
