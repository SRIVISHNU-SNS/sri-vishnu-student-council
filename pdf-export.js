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
  const imageHeight = (canvas.height * pageWidth) / canvas.width;
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
