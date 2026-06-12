// Main Application Logic for Vibe Playground

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const greetingEl = document.getElementById('userGreeting');
  const logConsole = document.getElementById('consoleLogs');
  
  const generateBtn = document.getElementById('generateColorsBtn');
  const gradientPreview = document.getElementById('gradientPreview');
  const gradientValText = document.getElementById('gradientValue');
  
  const bounceBtn = document.getElementById('bounceTestBtn');
  const glowToggle = document.getElementById('glowToggle');
  const tiltCard = document.getElementById('tiltCard');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // 1. Dynamic Greeting
  function updateGreeting() {
    const hours = new Date().getHours();
    let timeOfDay = 'Day';
    if (hours < 12) timeOfDay = 'Morning';
    else if (hours < 18) timeOfDay = 'Afternoon';
    else timeOfDay = 'Evening';
    
    greetingEl.innerHTML = `👋 Good ${timeOfDay}, <span class="gradient-text" style="font-weight: 700;">Dylan</span>`;
  }
  updateGreeting();

  // 2. Vibe Logger Helper
  function logEvent(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    
    let prefix = '[INFO]';
    if (type === 'system') prefix = '[SYSTEM]';
    if (type === 'success') prefix = '[SUCCESS]';
    if (type === 'vibe') prefix = '[VIBE_CHECK]';
    
    line.textContent = `[${timestamp}] ${prefix} ${message}`;
    logConsole.appendChild(line);
    
    // Auto-scroll to the bottom of the console
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  // 3. Vibrant HSL Gradient Generator
  function generateVibrantGradient() {
    // Generate base hue (0-360)
    const hue1 = Math.floor(Math.random() * 360);
    // Complementary/Analogous hue offset (60 to 120 degrees apart)
    const hueOffset = 60 + Math.floor(Math.random() * 60);
    const hue2 = (hue1 + hueOffset) % 360;
    
    // High saturation (80-95%) and comfortable lighting (50-60%) ensures they are vibrant
    const sat1 = 80 + Math.floor(Math.random() * 15);
    const sat2 = 80 + Math.floor(Math.random() * 15);
    const light1 = 50 + Math.floor(Math.random() * 10);
    const light2 = 50 + Math.floor(Math.random() * 10);
    
    const color1 = `hsl(${hue1}, ${sat1}%, ${light1}%)`;
    const color2 = `hsl(${hue2}, ${sat2}%, ${light2}%)`;
    const gradientString = `linear-gradient(135deg, ${color1}, ${color2})`;
    
    // Apply styling to preview panel
    gradientPreview.style.background = gradientString;
    gradientValText.textContent = gradientString;
    
    // Also update the glowing hover shadow in CSS variables for this element
    gradientPreview.style.boxShadow = `0 10px 30px rgba(${hue1}, 92%, 50%, 0.25)`;
    
    logEvent(`Generated vibrant gradient: ${color1} ➜ ${color2}`, 'success');
  }

  // Bind Generate Button
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      generateVibrantGradient();
    });
  }

  // 4. Micro-Interactions Hooks
  
  // Bouncing Button Click
  if (bounceBtn) {
    bounceBtn.addEventListener('click', () => {
      logEvent('Bouncing button clicked! Event dispatch check passed. 🚀', 'info');
    });
  }

  // Glowing Toggle Change
  if (glowToggle) {
    glowToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        logEvent('Glow mode toggle switched ON. Neon shadows expanded.', 'vibe');
        document.body.style.textShadow = '0 0 8px rgba(139, 92, 246, 0.3)';
      } else {
        logEvent('Glow mode toggle switched OFF. Normal mode active.', 'info');
        document.body.style.textShadow = 'none';
      }
    });
  }

  // 5. 3D Tilt Card Interaction
  if (tiltCard) {
    tiltCard.addEventListener('mousemove', (e) => {
      const cardRect = tiltCard.getBoundingClientRect();
      
      // Mouse coords relative to card center
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      const mouseX = e.clientX - cardRect.left - cardWidth / 2;
      const mouseY = e.clientY - cardRect.top - cardHeight / 2;
      
      // Calculate tilt angles (max tilt ~15 degrees)
      const rotateY = (mouseX / (cardWidth / 2)) * 15;
      const rotateX = -(mouseY / (cardHeight / 2)) * 15; // inverse Y axis
      
      tiltCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    tiltCard.addEventListener('mouseenter', () => {
      tiltCard.style.transition = 'transform 0.05s ease';
      logEvent('Mouse entered 3D tilt zone.', 'system');
    });

    tiltCard.addEventListener('mouseleave', () => {
      // Smooth transition back to center
      tiltCard.style.transition = 'transform 0.5s ease';
      tiltCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      logEvent('Mouse exited 3D tilt zone.', 'system');
    });
  }

  // 6. Clear Logs Button
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      logConsole.innerHTML = '';
      logEvent('Console logs cleared.', 'system');
    });
  }
});
