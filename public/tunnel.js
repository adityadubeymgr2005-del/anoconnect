// public/tunnel.js
// Interactive 3D Neon Tunnel Effect
(function() {
    const canvas = document.getElementById('tunnelCanvas');
    let ctx = canvas.getContext('2d');
    let width, height;
    
    // Tunnel parameters
    let angle = 0;
    let speed = 0.02;
    let baseSpeed = 0.02;
    let boostFactor = 1.0;
    let targetBoost = 1.0;
    let ringOffset = 0;
    let pulseIntensity = 0;
    
    // Colors
    const neonGreen = '#0fff50';
    const neonCyan = '#00ffcc';
    
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    
    function drawTunnel() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.8;
        
        // Smooth speed transition
        speed += (targetBoost - speed) * 0.1;
        const currentSpeed = baseSpeed * (1 + speed * 2);
        ringOffset += currentSpeed;
        
        // Draw concentric rings with perspective
        const numRings = 40;
        const ringSpacing = maxRadius / numRings;
        
        for (let i = 0; i < numRings; i++) {
            const ringRadius = (ringOffset + i * ringSpacing) % maxRadius;
            const opacity = 1 - (ringRadius / maxRadius) * 0.8;
            const lineWidth = 2 + (1 - ringRadius / maxRadius) * 3;
            
            // Glow effect
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            
            // Dynamic color based on speed boost
            let r = 15, g = 255, b = 80;
            if (targetBoost > 1.2) {
                g = 255;
                b = 150;
                r = 80;
            }
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // Inner glow
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius - 1, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`;
            ctx.lineWidth = lineWidth * 0.5;
            ctx.stroke();
        }
        
        // Draw radial lines (spokes)
        const numSpokes = 24;
        const spokeAngle = (angle + ringOffset * 2) % (Math.PI * 2);
        
        for (let i = 0; i < numSpokes; i++) {
            const radAngle = (i / numSpokes) * Math.PI * 2 + spokeAngle;
            const x1 = centerX + Math.cos(radAngle) * 5;
            const y1 = centerY + Math.sin(radAngle) * 5;
            const x2 = centerX + Math.cos(radAngle) * maxRadius;
            const y2 = centerY + Math.sin(radAngle) * maxRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, `rgba(15, 255, 80, 0.9)`);
            gradient.addColorStop(1, `rgba(15, 255, 80, 0)`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // Draw particle dots on rings
        const numParticles = 200;
        for (let i = 0; i < numParticles; i++) {
            const particleRadius = (ringOffset * 3 + i * 12) % maxRadius;
            const particleAngle = angle * 10 + i * 0.5;
            const x = centerX + Math.cos(particleAngle) * particleRadius;
            const y = centerY + Math.sin(particleAngle) * particleRadius;
            
            const size = 2 + (1 - particleRadius / maxRadius) * 3;
            ctx.fillStyle = `rgba(15, 255, 80, ${0.6 - particleRadius / maxRadius * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw central glow
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
        gradient.addColorStop(0, `rgba(15, 255, 80, ${0.3 + pulseIntensity * 0.2})`);
        gradient.addColorStop(1, 'rgba(15, 255, 80, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        angle += 0.02;
    }
    
    // Animation loop
    let animationId;
    function animate() {
        drawTunnel();
        animationId = requestAnimationFrame(animate);
    }
    
    // Public API for interaction
    window.tunnel = {
        setSpeedBoost: function(boost) {
            targetBoost = Math.min(2.5, Math.max(1.0, boost));
            pulseIntensity = (targetBoost - 1) * 0.5;
        },
        resetBoost: function() {
            targetBoost = 1.0;
            pulseIntensity = 0;
        },
        triggerPulse: function() {
            targetBoost = 1.8;
            pulseIntensity = 0.8;
            setTimeout(() => {
                if (targetBoost > 1.0) targetBoost = 1.2;
                setTimeout(() => {
                    if (targetBoost > 1.0) targetBoost = 1.0;
                    pulseIntensity = 0;
                }, 300);
            }, 200);
        }
    };
    
    // Handle resize
    window.addEventListener('resize', () => {
        resizeCanvas();
    });
    
    // Initialize
    resizeCanvas();
    animate();
})();