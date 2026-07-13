import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const APP_URL = 'https://tanvir-commits.github.io/triangle-networking-finder/';

export function QrCodeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    void QRCode.toCanvas(canvas, APP_URL, {
      width: 140,
      margin: 1,
      color: {
        dark: '#1f2933',
        light: '#ffffff',
      },
    });
  }, []);

  return (
    <section className="qr-section" aria-label="Open on phone">
      <canvas ref={canvasRef} className="qr-canvas" aria-hidden="true" />
      <div className="qr-copy">
        <p className="qr-label">Scan to open on your phone</p>
        <a href={APP_URL} className="qr-link" target="_blank" rel="noopener noreferrer">
          {APP_URL}
        </a>
      </div>
    </section>
  );
}
