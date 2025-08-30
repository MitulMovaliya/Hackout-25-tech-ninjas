(async function(){
  try {
    console.log('Poking satellite service /health...');
    const res = await fetch('http://localhost:8002/health', { method: 'GET' });
    console.log('Fetch completed. status=', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch error:', err && (err.stack || err.message || err));
    if (err && err.name) console.error('Error name:', err.name);
  }
})();
