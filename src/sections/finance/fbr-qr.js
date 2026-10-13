import { createElement } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';

// ----------------------------------------------------------------------
// The QR code FBR asks for on a reported invoice: the FBR invoice number,
// at least version 2 (25 x 25 modules), as a PNG data URL for jsPDF.
// ----------------------------------------------------------------------

export async function fbrQrDataUrl(text, px = 400) {
  // The namespace is spelled out: React leaves it off, and without it the
  // browser will not load the markup as an image.
  const svg = renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: text,
      size: px,
      level: 'M',
      minVersion: 2,
      marginSize: 1,
      xmlns: 'http://www.w3.org/2000/svg',
    })
  );
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.drawImage(img, 0, 0, px, px);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default fbrQrDataUrl;
