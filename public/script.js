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

async function loadSessions() {
  const sessions = await fetch('/api/sessions').then(res => res.json());
  const container = document.getElementById('sessions-list');
  if (sessions.length === 0) {
    container.innerHTML = '<p>No sessions yet.</p>';
    return;
  }
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sessions.map(s => `
    <div>
      <h4>${s.description}</h4>
      <p>${new Date(s.date).toLocaleDateString()} — ${s.attendees.length} attendee(s)</p>
    </div>
  `).join('');
}

document.getElementById('create-session-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dateInput = document.getElementById('session-date');
  const descriptionInput = document.getElementById('session-description');
  const date = dateInput.value;
  const description = descriptionInput.value.trim();
  if (!date || !description) return;
  await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, description })
  });
  dateInput.value = '';
  descriptionInput.value = '';
  loadSessions();
});

loadSessions();