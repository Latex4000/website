/**
 * Creates a confetti effect at the specified position
 */
export function triggerConfetti(x: number = window.innerWidth / 2, y: number = window.innerHeight / 2) {
    const colors = ['#ebdf35', '#f7ef83', '#ffd700', '#ffed4e', '#fff066'];
    const particleCount = 50;
    const particles: HTMLElement[] = [];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${x}px;
            top: ${y}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(particle);
        particles.push(particle);

        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 3 + Math.random() * 5;
        const lifetime = 1000 + Math.random() * 1000;
        
        animateParticle(particle, angle, velocity, lifetime);
    }

    // Clean up particles after animation
    setTimeout(() => {
        particles.forEach(p => p.remove());
    }, 2500);
}

function animateParticle(particle: HTMLElement, angle: number, velocity: number, lifetime: number) {
    const startTime = Date.now();
    const startX = parseFloat(particle.style.left);
    const startY = parseFloat(particle.style.top);
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / lifetime;
        
        if (progress >= 1) {
            return;
        }
        
        const distance = velocity * elapsed / 16;
        const x = startX + Math.cos(angle) * distance;
        const y = startY + Math.sin(angle) * distance + (progress * progress * 200);
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.opacity = String(1 - progress);
        particle.style.transform = `rotate(${progress * 720}deg)`;
        
        requestAnimationFrame(update);
    }
    
    requestAnimationFrame(update);
}

/**
 * Triggers success animation on a form
 */
export function animateSuccess(formElement: HTMLElement) {
    formElement.style.animation = 'successPulse 0.6s ease';
    setTimeout(() => {
        formElement.style.animation = '';
    }, 600);
}
