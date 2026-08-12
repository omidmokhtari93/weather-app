const fs = require('fs');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const radius = Math.round(size * 0.1875);
  const sunSize = Math.round(size * 0.156);
  const sunY = Math.round(size * 0.39);
  const cloudY = Math.round(size * 0.625);
  const cloudRadius = Math.round(size * 0.11);
  const cloudBaseY = Math.round(size * 0.74);
  const cloudInnerY = Math.round(size * 0.82);
  const cloudLeftX = Math.round(size * 0.39);
  const cloudRightX = Math.round(size * 0.61);
  const cloudCenterX = Math.round(size * 0.5);
  const innerCloudLeftX = Math.round(size * 0.35);
  const innerCloudRightX = Math.round(size * 0.65);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4a90e2"/>
      <stop offset="100%" style="stop-color:#9013fe"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#sky)" rx="${radius}"/>
  <circle cx="${size/2}" cy="${sunY}" r="${sunSize}" fill="#FFD700" opacity="0.9"/>
  <path d="M${cloudLeftX} ${cloudY} Q${cloudLeftX - cloudRadius} ${cloudY} ${cloudLeftX - cloudRadius} ${cloudBaseY} L${cloudRightX + cloudRadius} ${cloudBaseY} Q${cloudRightX + cloudRadius} ${cloudY} ${cloudCenterX} ${cloudY}" fill="white" opacity="0.9"/>
  <path d="M${innerCloudLeftX} ${cloudBaseY} Q${innerCloudLeftX} ${cloudInnerY} ${cloudCenterX} ${cloudInnerY} Q${innerCloudRightX} ${cloudInnerY} ${innerCloudRightX} ${cloudBaseY}" fill="white" opacity="0.7"/>
</svg>`;
  fs.writeFileSync(`public/icons/icon-${size}.svg`, svg);
});

console.log('SVG icons created for sizes:', sizes.join(', '));