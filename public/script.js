// ---- Member Management (index page) ----

async function loadMembers() {
  const members = await fetch('/api/members').then(res => res.json());
  const tbody = document.getElementById('members-tbody');
  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">No members yet.</td></tr>';
    return;
  }
  tbody.innerHTML = members.map(m => `<tr><td>${m.name}</td><td>${m.code}</td></tr>`).join('');
}

document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
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

// ---- Session Management (index page) ----

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
      <a href="session.html?id=${s.id}">View/Edit Attendance</a>
    </div>
  `).join('');
}

document.getElementById('create-session-form')?.addEventListener('submit', async (e) => {
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

// ---- Init for index page ----

if (document.getElementById('add-member-form')) {
  loadMembers();
  loadSessions();
}

// ---- Session Attendance (session.html page) ----

if (window.location.pathname.endsWith('session.html')) {

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  async function loadSessionDetails() {
    const [session, members] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`).then(res => res.json()),
      fetch('/api/members').then(res => res.json())
    ]);

    document.getElementById('session-title').textContent = session.description;
    document.getElementById('session-info').textContent =
      `Date: ${new Date(session.date).toLocaleDateString()} | ${session.attendees.length} attendee(s)`;

    const attendanceList = document.getElementById('attendance-list');
    if (members.length === 0) {
      attendanceList.innerHTML = '<p>No members available. Add members first!</p>';
      return;
    }

    attendanceList.innerHTML = members.map(member => `
      <div>
        <input type="checkbox" id="member-${member.code}" value="${member.code}"
          ${session.attendees.includes(member.code) ? 'checked' : ''}>
        <label for="member-${member.code}">${member.name} (${member.code})</label>
      </div>
    `).join('');
  }

  document.getElementById('attendance-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('#attendance-list input[type="checkbox"]');
    const attendees = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    await fetch(`/api/sessions/${sessionId}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendees })
    });

    loadSessionDetails();
  });

  loadSessionDetails();

  // Export CSV button handler
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      window.location.href = '/api/export/csv';
      showMessage('Downloading CSV file...', 'success');
  });
}

