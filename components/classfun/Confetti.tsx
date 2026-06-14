import React, { useEffect, useState } from 'react';

export const Confetti: React.FC = () => {
    const [particles] = useState(() => [...Array(80)].map((_, i) => ({
        id: i,
        x: 50,
        y: 50,
        color: ['#f44336', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800', '#9c27b0'][Math.floor(Math.random() * 6)],
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 1) * 20,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20
    })));

    const [frame, setFrame] = useState(0);

    useEffect(() => {
        let req: number;
        const animate = () => {
            setFrame(f => f + 1);
            req = requestAnimationFrame(animate);
        };
        req = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(req);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map(p => {
                const f = Math.min(frame, 200);
                const currentX = p.x + p.vx * f * 0.1;
                const currentY = p.y + p.vy * f * 0.1 + (f * f) * 0.05; // Gravity
                const rot = p.rotation + p.rotationSpeed * f;

                return (
                    <div key={p.id} className="absolute w-3 h-3 rounded-sm"
                        style={{
                            left: `${currentX}%`,
                            top: `${currentY}%`,
                            backgroundColor: p.color,
                            transform: `rotate(${rot}deg)`,
                            opacity: f > 150 ? 1 - (f - 150) / 50 : 1
                        }}
                    />
                );
            })}
        </div>
    );
};
