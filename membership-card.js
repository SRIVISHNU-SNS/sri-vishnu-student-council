const query = new URLSearchParams(window.location.search);
const code = query.get('code');
const status = document.querySelector('#card-status');
const downloadControls = document.querySelector('#card-downloads');
const downloadPng = document.querySelector('#download-png');
const downloadJpg = document.querySelector('#download-jpg');
const downloadPdf = document.querySelector('#download-pdf');
let member;
let qrDataUrl;

function safeFilename(value) {
  return String(value || 'membership').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
    if (image.decode) image.decode().then(() => resolve(image)).catch(() => {});
  });
}

async function drawCardCanvas() {
  const canvas = document.createElement('canvas');
  const scale = 2;
  const width = 1600;
  const height = 900;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  context.scale(scale, scale);

  context.fillStyle = '#2419dc';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#e52b12';
  context.lineWidth = 22;
  context.strokeRect(18, 18, width - 36, height - 36);
  context.strokeStyle = '#ffad08';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(75, 184);
  context.lineTo(width - 75, 184);
  context.moveTo(75, height - 118);
  context.lineTo(width - 75, height - 118);
  context.stroke();

  context.fillStyle = '#ffad08';
  context.font = '900 58px Arial, Helvetica, sans-serif';
  context.fillText('SRI VISHNU', 82, 112);
  context.fillStyle = '#fffaf2';
  context.font = '900 24px Arial, Helvetica, sans-serif';
  context.fillText('ISSUED WITH LOVE BY GENERAL COUNCIL', 85, 153);

  context.fillStyle = '#ffad08';
  context.font = '900 24px Arial, Helvetica, sans-serif';
  context.fillText('MEMBER', 86, 280);
  context.fillStyle = '#fffaf2';
  context.font = '900 70px Arial, Helvetica, sans-serif';
  const name = member.firstName || 'Member';
  context.fillText(name.length > 22 ? `${name.slice(0, 21)}…` : name, 82, 365);
  context.font = '32px Arial, Helvetica, sans-serif';
  context.fillText(`Section: ${member.section || ''}`, 86, 425);
  let detailsY = 470;
  if (member.clubName) {
    context.fillText(`Club: ${member.clubName}`, 86, detailsY);
    detailsY += 45;
  }
  context.fillText(`Role: ${member.role || 'Member'}`, 86, detailsY);
  context.fillStyle = '#ffad08';
  context.font = '900 28px Arial, Helvetica, sans-serif';
  context.fillText(member.memberCode || '', 86, detailsY + 55);

  if (member.photoDataUrl) {
    try {
      const photo = await loadImage(member.photoDataUrl);
      context.save();
      context.beginPath();
      context.rect(1015, 275, 180, 180);
      context.clip();
      const scale = Math.max(180 / photo.width, 180 / photo.height);
      const photoWidth = photo.width * scale;
      const photoHeight = photo.height * scale;
      context.drawImage(photo, 1105 - photoWidth / 2, 365 - photoHeight / 2, photoWidth, photoHeight);
      context.restore();
      context.strokeStyle = '#ffad08';
      context.lineWidth = 5;
      context.strokeRect(1015, 275, 180, 180);
    } catch (error) {
      console.warn('Member photo could not be loaded for export.');
    }
  }

  const qr = await loadImage(qrDataUrl);
  context.fillStyle = '#fffaf2';
  context.fillRect(1260, 245, 250, 250);
  context.drawImage(qr, 1275, 260, 220, 220);
  context.fillStyle = '#fffaf2';
  context.font = '900 18px Arial, Helvetica, sans-serif';
  context.fillText('SCAN TO VERIFY', 1310, 530);

  context.fillStyle = '#ffad08';
  context.font = '900 22px Arial, Helvetica, sans-serif';
  context.fillText('LISTEN · REPRESENT · DELIVER', 82, height - 70);
  return canvas;
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function base64Bytes(dataUrl) {
  const raw = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function makePdf(jpegDataUrl, width, height) {
  const encoder = new TextEncoder();
  const jpeg = base64Bytes(jpegDataUrl);
  const pageWidth = 842;
  const pageHeight = Math.round(pageWidth * height / width);
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}`,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  ];
  const chunks = [];
  const offsets = [0];
  let total = 0;
  const add = (chunk) => { const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk; chunks.push(bytes); total += bytes.length; };
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objects.forEach((object, index) => {
    offsets[index + 1] = total;
    add(`${index + 1} 0 obj\n${object}`);
    if (index === 4) add(jpeg);
    add('\nendstream\nendobj\n');
  });
  const xrefOffset = total;
  add(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) add(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

async function exportJpg() {
  const canvas = await drawCardCanvas();
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `sri-vishnu-membership-${safeFilename(member.memberCode)}.jpg`);
    else status.textContent = 'JPG could not be created. Please try again.';
  }, 'image/jpeg', 0.92);
}

async function exportPng() {
  const canvas = await drawCardCanvas();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('High-quality PNG could not be created. Please try again.');
  downloadBlob(blob, `sri-vishnu-membership-${safeFilename(member.memberCode)}.png`);
  status.textContent = 'High-quality PNG downloaded.';
}

async function exportPdf() {
  const canvas = await drawCardCanvas();
  const jpeg = canvas.toDataURL('image/jpeg', 0.92);
  downloadBlob(makePdf(jpeg, canvas.width, canvas.height), `sri-vishnu-membership-${safeFilename(member.memberCode)}.pdf`);
}

async function loadCard() {
  if (!code) throw new Error('No membership code was provided.');
  const response = await fetch(`/api/memberships/${encodeURIComponent(code)}?includePhoto=1`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Membership not found.');
  const qrResponse = await fetch(`/api/memberships/${encodeURIComponent(code)}/qr`);
  const qr = await qrResponse.json();
  if (!qrResponse.ok) throw new Error(qr.error || 'QR code unavailable.');
  member = result.member;
  qrDataUrl = qr.dataUrl;
  document.querySelector('#member-name').textContent = member.firstName;
  document.querySelector('#member-section').textContent = `Section: ${member.section}`;
  const club = document.querySelector('#member-club');
  club.hidden = !member.clubName;
  club.textContent = member.clubName ? `Club: ${member.clubName}` : '';
  document.querySelector('#member-role').textContent = `Role: ${member.role || 'Member'}`;
  document.querySelector('#member-code').textContent = member.memberCode;
  document.querySelector('#member-qr').src = qrDataUrl;
  const photoWrap = document.querySelector('#member-photo-wrap');
  if (member.photoDataUrl) {
    document.querySelector('#member-photo').src = member.photoDataUrl;
    photoWrap.hidden = false;
  } else {
    photoWrap.hidden = true;
  }
  downloadControls.hidden = false;
}

downloadPng.addEventListener('click', () => exportPng().catch((error) => { status.textContent = error.message; }));
downloadJpg.addEventListener('click', () => exportJpg().catch((error) => { status.textContent = error.message; }));
downloadPdf.addEventListener('click', () => exportPdf().catch((error) => { status.textContent = error.message; }));
loadCard().catch((error) => { status.textContent = error.message; });
