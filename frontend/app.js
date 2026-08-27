'use strict';

// window.API_BASE_URL is provided by config.js, generated at deploy time.
const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');

const statusEl = document.getElementById('status');
const itemsEl = document.getElementById('items');
const endpointEl = document.getElementById('api-endpoint');

if (API_BASE_URL) {
  endpointEl.textContent = API_BASE_URL;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || '';
}

async function loadItems() {
  itemsEl.innerHTML = '<li>Loading…</li>';
  try {
    const res = await fetch(`${API_BASE_URL}/items`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    renderItems(data.items || []);
    setStatus(`Loaded ${data.count ?? (data.items || []).length} item(s).`, 'ok');
  } catch (err) {
    // When the bad release is deployed, GET /items returns 500 and this shows.
    itemsEl.innerHTML = '<li class="error">Failed to load items.</li>';
    setStatus(`Error loading items: ${err.message}`, 'error');
  }
}

function renderItems(items) {
  if (!items.length) {
    itemsEl.innerHTML = '<li>No items yet. Add one above.</li>';
    return;
  }
  itemsEl.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    const price = typeof item.price === 'number' ? `$${item.price}` : item.price;
    li.textContent = `${item.name} — ${item.category} — ${price}`;
    itemsEl.appendChild(li);
  }
}

async function createItem(event) {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value.trim();
  const price = Number(document.getElementById('price').value);

  try {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    setStatus('Item created.', 'ok');
    event.target.reset();
    await loadItems();
  } catch (err) {
    setStatus(`Error creating item: ${err.message}`, 'error');
  }
}

document.getElementById('create-form').addEventListener('submit', createItem);
document.getElementById('refresh').addEventListener('click', loadItems);

loadItems();
