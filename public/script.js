// Utility Functions

// Authentication helpers

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (error) {
    showMessage('Logout failed', 'error');
  }
}

async function initPage() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = '/login.html';
      return;
    }
    const navAudit = document.getElementById('nav-audit');
    if (navAudit && data.role === 'super_admin') navAudit.style.display = 'block';
    const adminSection = document.getElementById('admin-section');
    if (adminSection && data.role === 'super_admin') adminSection.style.display = 'block';
  } catch (error) {
    window.location.href = '/login.html';
  }
}

if (!window.location.pathname.endsWith('login.html')) {
  initPage();
  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

// Display a message to the user
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// API call wrapper
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            if (response.status === 401) { // NEW: redirect if session expired
            window.location.href = '/login.html';
            return;
            }
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        return await response.json();
    } catch (error) {
        showMessage(error.message, 'error');
        throw error;
    }
}

if (window.location.pathname.endsWith('members.html')) {
  let allMembers = [];
  let allSessions = [];

  function calculateMemberHours(memberCode) { // NEW
    let hours = 0;
    allSessions.forEach(session => {
      const attendee = session.attendees.find(a => a.code === memberCode);
      if (attendee) hours += attendee.hours || session.hours || 1;
    });
    return hours;
  }

  function filterAndSortMembers() { // NEW
    let filtered = [...allMembers];
    const searchTerm = document.getElementById('member-search')?.value.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.code.toLowerCase().includes(searchTerm) ||
        (member.yearLevel && member.yearLevel.toString().toLowerCase().includes(searchTerm)) ||
        (member.email && member.email.toLowerCase().includes(searchTerm))
      );
    }
    const sortValue = document.getElementById('member-sort')?.value || '';
    if (sortValue) {
      filtered.sort((a, b) => {
        switch (sortValue) {
          case 'year-asc': return (parseInt(a.yearLevel) || 999) - (parseInt(b.yearLevel) || 999);
          case 'year-desc': return (parseInt(b.yearLevel) || -1) - (parseInt(a.yearLevel) || -1);
          case 'hours-asc': return calculateMemberHours(a.code) - calculateMemberHours(b.code);
          case 'hours-desc': return calculateMemberHours(b.code) - calculateMemberHours(a.code);
          default: return 0;
        }
      });
    }
    displayMembers(filtered);
  }

  async function loadMembersPage() { // CHANGED: now fetches sessions too, for hours
    try {
      [allMembers, allSessions] = await Promise.all([
        fetch('/api/members').then(res => res.json()),
        fetch('/api/sessions').then(res => res.json())
      ]);
      filterAndSortMembers();
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }

  function displayMembers(members) { // CHANGED: adds email, hours, edit/delete
    const tbody = document.getElementById('members-tbody');
    document.getElementById('member-count').textContent = members.length;
    if (members.length === 0) {
      tbody.innerHTML = allMembers.length === 0
        ? '<tr><td colspan="6" class="empty-state"><p>No members yet. Add your first member above!</p></td></tr>'
        : '<tr><td colspan="6" class="empty-state"><p>No members match your search.</p></td></tr>';
      return;
    }
    tbody.innerHTML = members.map(member => `
      <tr>
        <td>${member.name}</td>
        <td><strong>${member.code}</strong></td>
        <td>${member.yearLevel || '-'}</td>
        <td>${member.email || '-'}</td>
        <td>${calculateMemberHours(member.code)} hrs</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-edit" onclick="editMember('${member.code}')">Edit</button>
            <button class="btn btn-delete" onclick="deleteMember('${member.code}', '${member.name}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('member-search')?.addEventListener('input', filterAndSortMembers);
  document.getElementById('member-sort')?.addEventListener('change', filterAndSortMembers);

  document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('member-name');
    const yearLevelInput = document.getElementById('member-year-level');
    const emailInput = document.getElementById('member-email'); // NEW
    const name = nameInput.value.trim();
    const yearLevel = yearLevelInput.value.trim();
    const email = emailInput.value.trim(); // NEW
    if (!name) return;
    try {
      const member = await apiCall('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, yearLevel, email })
      });
      showMessage(`Member "${member.name}" added with code ${member.code}!`, 'success');
      nameInput.value = ''; yearLevelInput.value = ''; emailInput.value = '';
      loadMembersPage();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  });

  window.editMember = function(code) { // NEW
    const member = allMembers.find(m => m.code === code);
    if (!member) return;
    document.getElementById('edit-member-old-code').value = member.code;
    document.getElementById('edit-member-name').value = member.name;
    document.getElementById('edit-member-code').value = member.code;
    document.getElementById('edit-member-year-level').value = member.yearLevel || '';
    document.getElementById('edit-member-email').value = member.email || '';
    document.getElementById('edit-member-modal').style.display = 'flex';
  };

  function closeEditMemberModal() {
    document.getElementById('edit-member-modal').style.display = 'none';
  }
  document.querySelector('#edit-member-modal .modal-close')?.addEventListener('click', closeEditMemberModal);
  document.querySelector('#edit-member-modal .modal-cancel')?.addEventListener('click', closeEditMemberModal);

  document.getElementById('edit-member-form')?.addEventListener('submit', async (e) => { // NEW
    e.preventDefault();
    const oldCode = document.getElementById('edit-member-old-code').value;
    const name = document.getElementById('edit-member-name').value.trim();
    const newCode = document.getElementById('edit-member-code').value.trim();
    const yearLevel = document.getElementById('edit-member-year-level').value.trim();
    const email = document.getElementById('edit-member-email').value.trim();
    try {
      await apiCall(`/api/members/${oldCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, newCode, yearLevel, email })
      });
      showMessage('Member updated successfully!', 'success');
      closeEditMemberModal();
      loadMembersPage();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  });

  window.deleteMember = async function(code, name) { // NEW
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiCall(`/api/members/${code}`, { method: 'DELETE' });
      showMessage(`Member "${name}" deleted.`, 'success');
      loadMembersPage();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  window.onclick = function(event) { // NEW
    const modal = document.getElementById('edit-member-modal');
    if (event.target === modal) closeEditMemberModal();
  };

  loadMembersPage();
}


if (window.location.pathname.endsWith('sessions.html')) {
    // Load sessions
    async function loadSessions() {
        try {
            const sessions = await fetch('/api/sessions').then(res => res.json());
            const container = document.getElementById('sessions-list');
            
            if (sessions.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No sessions yet. Create your first session above!</p></div>';
                return;
            }
            
            // Sort sessions by date (most recent first)
            sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            container.innerHTML = sessions.map(session => {
                const attendeeCount = session.attendees.length;
                const attendeeText = attendeeCount === 1 ? '1 attendee' : `${attendeeCount} attendees`;
                return `
                    <div class="session-item">
                    <h4>${session.description}</h4>
                    <p><strong>Date:</strong> ${new Date(session.date).toLocaleDateString()}</p>
                    <p><strong>Hours:</strong> ${session.hours || 1}</p> <!-- NEW -->
                    <p><strong>Attendance:</strong> ${attendeeText}</p>
                    ${session.attendees.length > 0 ? `
                        <div class="attendees">
                            <strong>Attendees:</strong> ${session.attendees.map(a => a.code).join(', ')} <!-- CHANGED -->
                        </div>
                    ` : ''}
                    <a href="session.html?id=${session.id}" class="btn btn-info">View/Edit Attendance</a>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    // Create session form handler
    document.getElementById('create-session-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateInput = document.getElementById('session-date');
        const descriptionInput = document.getElementById('session-description');
        const hoursInput = document.getElementById('session-hours');

        const date = dateInput.value;
        const description = descriptionInput.value.trim();
        const hours = hoursInput.value;

        if (!date || !description) return;

        try {
            const session = await apiCall('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, description, hours })
            });
            showMessage(`Session "${session.description}" created!`, 'success');
            dateInput.value = '';
            descriptionInput.value = '';
            hoursInput.value = '1';
            loadSessions();
        } catch (error) {
            console.error('Error creating session:', error);
        }
    });
  loadSessions();
}

if (window.location.pathname.endsWith('export.html')) {
  async function loadSessionsForExport() {
    const sessions = await fetch('/api/sessions').then(r => r.json());
    const container = document.getElementById('session-selection-list');
    container.innerHTML = sessions.map(s => `
      <label class="session-checkbox">
        <input type="checkbox" class="export-session-checkbox" value="${s.id}">
        ${s.description} — ${new Date(s.date).toLocaleDateString()} (${s.hours || 1}hr default)
      </label>
    `).join('');
  }

  function buildExportUrl(sessionIds) {
    const params = new URLSearchParams();
    params.set('orientation', document.getElementById('orientation').value);
    params.set('memberDisplay', document.getElementById('member-display').value);
    const start = document.getElementById('date-range-start').value;
    const end = document.getElementById('date-range-end').value;
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (sessionIds) params.set('sessionIds', sessionIds.join(','));
    return `/api/export/csv?${params.toString()}`;
  }

  document.getElementById('select-all-sessions')?.addEventListener('click', () => {
    document.querySelectorAll('.export-session-checkbox').forEach(cb => cb.checked = true);
  });
  document.getElementById('deselect-all-sessions')?.addEventListener('click', () => {
    document.querySelectorAll('.export-session-checkbox').forEach(cb => cb.checked = false);
  });

  document.getElementById('export-selected-btn')?.addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.export-session-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      showMessage('Select at least one session first', 'error');
      return;
    }
    window.location.href = buildExportUrl(selected);
  });

  document.getElementById('export-all-btn')?.addEventListener('click', () => {
    window.location.href = buildExportUrl(null);
  });

  loadSessionsForExport();
}

// Session Page Functions
if (window.location.pathname.endsWith('session.html')) {
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    
    if (!sessionId) {
        showMessage('No session ID provided', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }

    // Load session details and attendance
    async function loadSessionDetails() {
        try {
            const [session, members] = await Promise.all([
                fetch(`/api/sessions/${sessionId}`).then(res => res.json()),
                fetch('/api/members').then(res => res.json())
            ]);
            
            // Display session details
            document.getElementById('session-title').textContent = session.description;
            document.getElementById('session-info').textContent = 
                `Date: ${new Date(session.date).toLocaleDateString()} | ${session.attendees.length} attendee(s)`;
            
            // Display attendance checkboxes
            const attendanceList = document.getElementById('attendance-list');
            
            if (members.length === 0) {
                attendanceList.innerHTML = '<div class="empty-state"><p>No members available. Add members first!</p></div>';
                return;
            }
            
            attendanceList.innerHTML = members.map(member => {
                const existingAttendee = session.attendees.find(a => a.code === member.code); // CHANGED
                const isAttending = !!existingAttendee;
                const hoursValue = existingAttendee ? existingAttendee.hours : (session.hours || 1); // NEW
                return `
                    <div class="attendance-item">
                    <input type="checkbox" id="member-${member.code}" value="${member.code}" ${isAttending ? 'checked' : ''}>
                    <label for="member-${member.code}">${member.name} (${member.code})</label>
                    <input type="number" class="attendance-hours-input" id="hours-${member.code}" min="0" step="1" value="${hoursValue}"> <!-- NEW -->
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading session details:', error);
            showMessage('Failed to load session details', 'error');
        }
    }

    // Save attendance form handler
    document.getElementById('attendance-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('#attendance-list input[type="checkbox"]');
        const attendees = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => {
            const hoursInput = document.getElementById(`hours-${cb.value}`); // NEW
            return { code: cb.value, hours: hoursInput.value || 1 }; // CHANGED: object, not just code
            });
        try {
            await apiCall(`/api/sessions/${sessionId}/attendance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendees })
            });
            showMessage('Attendance saved successfully!', 'success');
            setTimeout(() => loadSessionDetails(), 500);
        } catch (error) {
            console.error('Error saving attendance:', error);
        }
    });

    // Initialize session page
    loadSessionDetails();
}

// Settings Page Functions
if (window.location.pathname.endsWith('settings.html')) {
  async function loadUserInfo() {
    try {
      const response = await fetch('/api/check-auth');
      const data = await response.json();
      document.getElementById('user-username').textContent = data.username || '-';
      document.getElementById('user-role').textContent = data.role || '-';
      document.getElementById('user-display-name').textContent = data.displayName || '-';
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }
  loadUserInfo();

  document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }

    try {
        await apiCall('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
        });
        showMessage('Password changed successfully!', 'success');
        document.getElementById('change-password-form').reset();
    } catch (error) {
        console.error('Error changing password:', error);
    }
    });
}

// Audit Log Page Functions
if (window.location.pathname.endsWith('audit-log.html')) {
    
    // Check authentication and super admin role
    async function checkSuperAdmin() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            if (!data.authenticated) {
                window.location.href = '/login.html';
            } else if (data.role !== 'super_admin') {
                showMessage('Access denied. Super admin only.', 'error');
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login.html';
        }
    }
    
    checkSuperAdmin();
    
    // Add logout button handler
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    
    // Load audit log
    async function loadAuditLog() {
        try {
            const logs = await apiCall('/api/audit-log');
            const tbody = document.getElementById('audit-log-tbody');
            
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No audit log entries yet.</p></td></tr>';
                return;
            }
            
            // Sort logs by timestamp, most recent first
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            tbody.innerHTML = logs.map(log => {
                const date = new Date(log.timestamp);
                const formattedDate = date.toLocaleString();
                const details = JSON.stringify(log.data, null, 2);
                
                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td><strong>${log.username || 'unknown'}</strong></td>
                        <td><span class="action-badge">${log.action}</span></td>
                        <td><pre style="margin: 0; font-size: 0.85em; max-width: 400px; overflow-x: auto;">${details}</pre></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading audit log:', error);
            showMessage('Failed to load audit log', 'error');
        }
    }
    
    // Initialize audit log page
    loadAuditLog();
}
