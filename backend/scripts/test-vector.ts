// backend/scripts/test-vector.js
// Simple storage + search sanity check for Pinecone/OpenAI pipeline.

import 'dotenv/config'; // pick up .env for API base if set
const fetchFn = global.fetch;

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:4000';
const id = `test-item-${Date.now()}`;
const description = 'Black Logitech MX Master 3 wireless mouse with slight wear on left thumb rest';
const locationName = 'Union Station GO';
const attributes = {
  category: 'electronics',
  brand: 'Logitech',
  model: 'MX Master 3',
  color: 'black',
  distinctiveFeatures: ['thumb rest wear', 'bluetooth'],
  summary: description,
};

async function storeItem() {
  const res = await fetchFn(`${API_BASE}/api/items/store`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      itemId: id,
      filename: `${id}.jpg`,
      locationName,
      description,
      attributes,
    }),
  });
  if (!res.ok) throw new Error(`store failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function search(query) {
  const res = await fetchFn(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`search failed ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  console.log('Storing item:', id);
  await storeItem();
  console.log('Stored. Searching for: "logitech black mouse"');
  const { results } = await search('logitech black mouse with thumb rest wear');
  console.log('\nTop results:');
  results?.forEach((r, i) => {
    console.log(
      `${i + 1}. id=${r.id} score=${(r.score * 100).toFixed(1)}% desc="${r.metadata?.description || ''}"`
    );
  });
  const hit = results?.find(r => r.id === id);
  console.log(hit ? '\n✅ Expected item returned.' : '\n❌ Expected item NOT in top results.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
