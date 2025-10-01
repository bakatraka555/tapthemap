async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

document.getElementById('donate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const amount_eur = Number(fd.get('amount_eur'));
  const payload = {
    amount_cents: Math.round(amount_eur * 100),
    country_iso: fd.get('country_iso'),
    country_name: fd.get('country_name'),
    ref: fd.get('ref') || '',
    email: fd.get('email') || null
  };
  try {
    const data = await postJSON('/api/checkout', payload);
    if(data.url) window.location.href = data.url;
    else alert('No checkout URL returned');
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

async function loadLeaders() {
  const res = await fetch('/api/leaders');
  const data = await res.json();
  const ul24 = document.getElementById('leaders-24h');
  const ul7 = document.getElementById('leaders-7d');
  ul24.innerHTML = (data.leaders_24h||[]).map(r=>`<li>${r.country_iso}: ${r.unique_donors}</li>`).join('');
  ul7.innerHTML = (data.leaders_7d||[]).map(r=>`<li>${r.country_iso}: ${r.unique_donors}</li>`).join('');
}

async function loadToday() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  document.getElementById('today-heat').textContent = JSON.stringify(data, null, 2);
}

loadLeaders().catch(console.error);
loadToday().catch(console.error);
