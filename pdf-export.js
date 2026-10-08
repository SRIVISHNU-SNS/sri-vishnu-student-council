async function waitForImages(element) {
  await Promise.all([...element.querySelectorAll('img')].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })));
}

async function downloadElementAsPdf(element, filename, { backgroundColor = '#fffaf2', onProgress } = {}) {
  if (!element || typeof html2canvas !== 'function' || !window.jspdf?.jsPDF) throw new Error('PDF download is temporarily unavailable.');
  await waitForImages(element);
  onProgress?.('Preparing PDF…');
  const canvas = await html2canvas(element, { scale: Math.min(2, 1800 / Math.max(element.scrollWidth, 1)), useCORS: true, allowTaint: false, backgroundColor, logging: false, windowWidth: Math.max(document.documentElement.clientWidth, element.scrollWidth) });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 8;
  const pageWidth = 210 - (margin * 2);
  const pageHeight = 297 - (margin * 2);
  const pageCanvasHeight = Math.max(1, Math.floor((canvas.width * pageHeight) / pageWidth));
  let offset = 0;
  let page = 0;
  while (offset < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - offset);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice.getContext('2d').drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) pdf.addPage();
    const renderedHeight = (sliceHeight * pageWidth) / canvas.width;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, pageWidth, renderedHeight, undefined, 'FAST');
    offset += sliceHeight;
    page += 1;
  }
  pdf.save(filename);
  onProgress?.('PDF downloaded.');
}

function collectStyles() {
  return [...document.styleSheets].map((sheet) => {
    try { return [...sheet.cssRules].map((rule) => rule.cssText).join('\n'); } catch (error) { return ''; }
  }).join('\n');
}

async function imageAsDataUrl(source) {
  if (!source || source.startsWith('data:')) return source;
  try {
    const response = await fetch(new URL(source, window.location.href).href, { credentials: 'same-origin' });
    if (!response.ok) return source;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(source);
      reader.readAsDataURL(blob);
    });
  } catch (error) { return source; }
}

async function downloadElementAsSvg(element, filename, { backgroundColor = '#fffaf2', onProgress } = {}) {
  if (!element) throw new Error('SVG download is temporarily unavailable.');
  await waitForImages(element);
  onProgress?.('Preparing SVG…');
  const width = Math.ceil(element.scrollWidth || element.getBoundingClientRect().width);
  const height = Math.ceil(element.scrollHeight || element.getBoundingClientRect().height);
  const clone = element.cloneNode(true);
  clone.hidden = false;
  clone.removeAttribute('id');
  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.margin = '0';
  clone.style.backgroundColor = backgroundColor;
  await Promise.all([...clone.querySelectorAll('img')].map(async (image) => {
    image.src = await imageAsDataUrl(image.getAttribute('src'));
  }));
  const style = document.createElement('style');
  style.textContent = collectStyles();
  clone.prepend(style);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${backgroundColor}"/><foreignObject x="0" y="0" width="${width}" height="${height}">${serialized}</foreignObject></svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  onProgress?.('SVG downloaded.');
}

async function downloadElementAsImage(element, filename, { backgroundColor = '#fffaf2', onProgress } = {}) {
  if (!element || typeof html2canvas !== 'function') throw new Error('Image download is temporarily unavailable.');
  await waitForImages(element);
  onProgress?.('Preparing image…');
  const width = Math.max(element.scrollWidth, 1);
  const canvas = await html2canvas(element, { scale: Math.min(3, 2400 / width), useCORS: true, allowTaint: false, backgroundColor, logging: false, windowWidth: Math.max(document.documentElement.clientWidth, width) });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Image download could not be created.');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  onProgress?.('Image downloaded.');
}
