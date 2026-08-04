async function loadMembers() {
  const members = await fetch('/api/members').then(res => res.json());
  const tbody = document.getElementById('members-tbody');
  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">No members yet.</td></tr>';
    return;
  }
  tbody.innerHTML = members.map(m => `<tr><td>${m.name}</td><td>${m.code}</td></tr>`).join('');
}

document.getElementById('add-member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('member-name');
  const name = nameInput.value.trim();
  if (!name) return;
  await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  nameInput.value = '';
  loadMembers();
});

loadMembers();