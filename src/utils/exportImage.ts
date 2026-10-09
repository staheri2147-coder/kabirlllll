import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import { VAZIRMATN_WOFF2_BASE64 } from './vazirmatnFontBase64';

const EMBEDDED_VAZIRMATN_CSS = `
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 300 900;
  font-display: swap;
  src: url('data:font/woff2;base64,${VAZIRMATN_WOFF2_BASE64}') format('woff2');
}
*, *::before, *::after, body, table, th, td, div, span, p, h1, h2, h3 {
  font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif !important;
}
`;

export async function exportElementAsPng(
  elementId: string,
  defaultFileName: string,
  standardWidth = 960
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return false;
  }

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as any).fonts.ready;
    } catch (e) {}
  }

  const targetWidth = Math.max(standardWidth, 960);
  const a4MinHeight = Math.round((targetWidth * 297) / 210);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = `${targetWidth}px`;
  container.style.minWidth = `${targetWidth}px`;
  container.style.zIndex = '-99999';
  container.style.backgroundColor = '#ffffff';
  container.dir = 'rtl';

  const pageWrapper = document.createElement('div');
  pageWrapper.style.width = `${targetWidth}px`;
  pageWrapper.style.minWidth = `${targetWidth}px`;
  pageWrapper.style.maxWidth = `${targetWidth}px`;
  pageWrapper.style.minHeight = `${a4MinHeight}px`;
  pageWrapper.style.boxSizing = 'border-box';
  pageWrapper.style.backgroundColor = '#ffffff';
  pageWrapper.style.padding = '32px 40px';
  pageWrapper.style.display = 'flex';
  pageWrapper.style.flexDirection = 'column';
  pageWrapper.style.justifyContent = 'flex-start';
  pageWrapper.style.alignItems = 'stretch';
  pageWrapper.style.position = 'relative';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '100%';
  clone.style.minWidth = '100%';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.backgroundColor = 'transparent';
  clone.style.boxSizing = 'border-box';
  clone.style.boxShadow = 'none';
  clone.style.position = 'static';
  clone.style.transform = 'none';

  // Snapshot computed rgb styles to prevent oklch color parsing errors in html2canvas
  const origElements = element.querySelectorAll<HTMLElement>('*');
  const clnElements = clone.querySelectorAll<HTMLElement>('*');
  for (let i = 0; i < clnElements.length; i++) {
    const orig = origElements[i];
    const cln = clnElements[i];
    if (orig && cln) {
      const comp = window.getComputedStyle(orig);
      if (comp.color) cln.style.color = comp.color;
      if (comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)' && comp.backgroundColor !== 'transparent') {
        cln.style.backgroundColor = comp.backgroundColor;
      }
      if (comp.borderColor && comp.borderColor !== 'rgba(0, 0, 0, 0)') {
        cln.style.borderColor = comp.borderColor;
      }
    }
  }

  const transformedElements = Array.from(clone.querySelectorAll<HTMLElement>('*'));
  for (const el of transformedElements) {
    if (el.style.transform && el.style.transform.includes('scale')) {
      el.style.transform = 'none';
    }
  }

  const fontStyle = document.createElement('style');
  fontStyle.innerHTML = EMBEDDED_VAZIRMATN_CSS;
  pageWrapper.prepend(fontStyle);

  pageWrapper.appendChild(clone);
  container.appendChild(pageWrapper);
  document.body.appendChild(container);

  try {
    const images = Array.from(pageWrapper.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((res) => {
            if (img.complete) return res();
            img.onload = () => res();
            img.onerror = () => res();
            setTimeout(res, 350);
          })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 80));

    let canvas: HTMLCanvasElement;
    try {
      canvas = await htmlToImage.toCanvas(pageWrapper, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => !(node instanceof HTMLElement && node.classList && node.classList.contains('no-print')),
        cacheBust: true,
      });
    } catch (h2iErr) {
      console.warn('htmlToImage failed, falling back to html2canvas:', h2iErr);
      canvas = await html2canvas(pageWrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (node) => node.classList && node.classList.contains('no-print'),
      });
    }

    const scale = 2;
    const pageHeightPx = Math.round(a4MinHeight * scale);
    const totalHeight = canvas.height;
    const canvasWidth = canvas.width;
    const baseName = defaultFileName.endsWith('.png') ? defaultFileName.slice(0, -4) : defaultFileName;

    if (totalHeight <= pageHeightPx * 1.1) {
      const url = canvas.toDataURL('image/png', 0.98);
      const link = document.createElement('a');
      link.download = `${baseName}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const numPages = Math.ceil(totalHeight / pageHeightPx);
      for (let i = 0; i < numPages; i++) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        const currentHeight = Math.min(pageHeightPx, totalHeight - i * pageHeightPx);
        pageCanvas.height = currentHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            i * pageHeightPx,
            canvasWidth,
            currentHeight,
            0,
            0,
            canvasWidth,
            currentHeight
          );
        }
        const pageUrl = pageCanvas.toDataURL('image/png', 0.98);
        const pageFileName = `${baseName}_صفحه_${i + 1}.png`;
        setTimeout(() => {
          const link = document.createElement('a');
          link.download = pageFileName;
          link.href = pageUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, i * 450);
      }
    }

    return true;
  } catch (error) {
    console.error('Image export failed:', error);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


