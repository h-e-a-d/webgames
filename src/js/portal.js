// portal.js — homepage interactivity (search)

const searchInput = document.getElementById('search-input');

searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.game-card').forEach(card => {
    const title = card.querySelector('.title')?.textContent.toLowerCase() || '';
    const cat   = card.querySelector('.cat')?.textContent.toLowerCase() || '';
    card.style.display = (title.includes(q) || cat.includes(q)) ? '' : 'none';
  });
});
