const query = new URLSearchParams(window.location.search);
const code = query.get('code');
const status = document.querySelector('#card-status');

async function loadCard() {
  if (!code) throw new Error('No membership code was provided.');
  const response = await fetch(`/api/memberships/${encodeURIComponent(code)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Membership not found.');
  const qrResponse = await fetch(`/api/memberships/${encodeURIComponent(code)}/qr`);
  const qr = await qrResponse.json();
  if (!qrResponse.ok) throw new Error(qr.error || 'QR code unavailable.');
  document.querySelector('#member-name').textContent = result.member.firstName;
  document.querySelector('#member-section').textContent = `Section: ${result.member.section}`;
  document.querySelector('#member-code').textContent = result.member.memberCode;
  document.querySelector('#member-qr').src = qr.dataUrl;
}
loadCard().catch((error) => { status.textContent = error.message; });
