require('dotenv').config(); // Load SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH from .env
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Authentication: session setup 
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Authentication: block direct access to protected pages without login
app.use((req, res, next) => {
  if (req.path.includes('/login.html') ||
      req.path.includes('.css') ||
      req.path.includes('.js') ||
      req.path.startsWith('/api/')) {
    return next();
  }
  const protectedPages = ['/', '/index.html', '/session.html', '/audit-log.html', '/members.html', '/sessions.html', '/export.html', '/admin-management.html', '/settings.html'];
  if (protectedPages.includes(req.path)) {
    if (!req.session.authenticated) {
      return res.redirect('/login.html');
    }
  }
  next();
});


// File paths
const DATA_FILE = path.join(__dirname, 'data.json');
const AUDIT_LOG_FILE = path.join(__dirname, 'audit_log.json');

// Helper function to read data
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return { members: [], sessions: [] };
  }
}

// Authentication: credentials + middleware
const USERS_FILE = path.join(__dirname, 'users.json'); // NEW: multi-user store

async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

async function writeUsers(users) { 
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Unauthorized. Please login first.' });
  }
  next();
}

// restricts a route to super_admin role only
function requireSuperAdmin(req, res, next) {
  if (!req.session.authenticated || req.session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden. Super admin access required.' });
  }
  next();
}

// Helper function to write data
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Helper function to log audit entry
async function logAudit(action, data, username) { 
  try {
    const logData = await fs.readFile(AUDIT_LOG_FILE, 'utf8');
    const logs = JSON.parse(logData);
    logs.push({ timestamp: new Date().toISOString(), username: username || 'unknown', action, data }); // NEW: username field
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
// Helper function to generate unique member code
function generateMemberCode(name, existingCodes) {
  // Remove special characters and convert to uppercase
  const cleanName = name.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  
  let code = '';
  
  if (words.length === 1) {
    // Single name: take first 6 letters
    code = words[0].substring(0, 6);
  } else if (words.length >= 2) {
    // Multiple names: First name + first letter of last name
    const firstName = words[0];
    const lastInitial = words[words.length - 1].charAt(0);
    code = (firstName.substring(0, 5) + lastInitial).substring(0, 6);
  }
  
  // Ensure uniqueness by adding numbers if needed
  let finalCode = code;
  let counter = 1;
  while (existingCodes.includes(finalCode)) {
    finalCode = code + counter;
    counter++;
  }
  
  return finalCode;
}

// Generate unique session ID
function generateSessionId(existingSessions) {
  let maxId = 0;
  existingSessions.forEach(session => {
    const id = parseInt(session.id);
    if (id > maxId) maxId = id;
  });
  return (maxId + 1).toString();
}

// API Endpoints
// Authentication Endpoints 
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const users = await readUsers();
    const user = users.find(u => u.username === username);
    const validPassword = user && await bcrypt.compare(password, user.passwordHash);
    if (user && validPassword) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.role = user.role; 
      req.session.displayName = user.displayName; 
      return res.json({ success: true, role: user.role, displayName: user.displayName });
    }
    res.status(401).json({ error: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Failed to logout' });
    res.json({ success: true, message: 'Logout successful' });
  });
});

app.get('/api/check-auth', (req, res) => {
  res.json({
    authenticated: !!req.session.authenticated,
    username: req.session.username,
    role: req.session.role,      
    displayName: req.session.displayName 
  });
});

app.put('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === req.session.username);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validCurrent = await bcrypt.compare(currentPassword, users[userIndex].passwordHash);
    if (!validCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
    await writeUsers(users);
    await logAudit('CHANGE_PASSWORD', { username: req.session.username }, req.session.username);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.get('/api/users', requireSuperAdmin, async (req, res) => {
  try {
    const users = await readUsers();
    const safeUsers = users.map(u => ({ username: u.username, role: u.role, displayName: u.displayName }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, role, displayName } = req.body;
    if (!username || !password || !role || !displayName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or super_admin' });
    }
    const users = await readUsers();
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10); // hashed, not plaintext
    users.push({ username, passwordHash, role, displayName });
    await writeUsers(users);
    await logAudit('ADD_USER', { username, role, displayName }, req.session.username);
    res.json({ success: true, message: 'User added successfully', user: { username, role, displayName } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.put('/api/users/:username', requireSuperAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, displayName } = req.body;
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    if (role && !['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or super_admin' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (role === 'admin' && users[userIndex].role === 'super_admin') {
      const superAdminCount = users.filter(u => u.role === 'super_admin').length;
      if (superAdminCount <= 1) return res.status(400).json({ error: 'Cannot demote the last super admin' });
    }
    if (password) users[userIndex].passwordHash = await bcrypt.hash(password, 10);
    if (role) users[userIndex].role = role;
    if (displayName) users[userIndex].displayName = displayName;
    await writeUsers(users);
    await logAudit('UPDATE_USER', { username, updates: { password: password ? '***' : undefined, role, displayName } }, req.session.username);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:username', requireSuperAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    if (username === req.session.username) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    if (users[userIndex].role === 'super_admin') {
      const superAdminCount = users.filter(u => u.role === 'super_admin').length;
      if (superAdminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last super admin' });
    }
    const deletedRole = users[userIndex].role; // captured before splice
    users.splice(userIndex, 1);
    await writeUsers(users);
    await logAudit('DELETE_USER', { username, role: deletedRole }, req.session.username);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/system-stats', requireSuperAdmin, async (req, res) => {
  try {
    const data = await readData();
    const users = await readUsers();
    const logData = await fs.readFile(AUDIT_LOG_FILE, 'utf8');
    const logs = JSON.parse(logData);
    const recentActivity = logs.slice(-10).reverse();
    res.json({
      totalMembers: data.members.length,
      totalSessions: data.sessions.length,
      totalUsers: users.length,
      superAdmins: users.filter(u => u.role === 'super_admin').length,
      admins: users.filter(u => u.role === 'admin').length,
      totalAuditLogs: logs.length,
      recentActivity
      // totalHours omitted — depends on per-session hours tracking, not built yet
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Data Management Endpoints (Protected) 
// GET /api/members - Return all members
app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /api/members - Add a new member
app.post('/api/members', requireAuth,async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const data = await readData();
    const existingCodes = data.members.map(m => m.code);
    const code = generateMemberCode(name.trim(), existingCodes);
    
    const newMember = {
      name: name.trim(),
      code
    };
    
    data.members.push(newMember);
    await writeData(data);
    await logAudit('ADD_MEMBER', newMember, req.session.username);
    
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// GET /api/sessions - Return all sessions
app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions - Create a new session
app.post('/api/sessions', requireAuth, async (req, res) => {
  try {
    const { date, description } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({ error: 'Date and description are required' });
    }
    
    const data = await readData();
    const id = generateSessionId(data.sessions);
    
    const newSession = {
      id,
      date,
      description,
      attendees: []
    };
    
    data.sessions.push(newSession);
    await writeData(data);
    await logAudit('CREATE_SESSION', newSession, req.session.username);
    
    res.status(201).json(newSession);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:id - Get a specific session with attendance details
app.get('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const session = data.sessions.find(s => s.id === id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// PUT /api/sessions/:id/attendance - Update attendance for a session
app.put('/api/sessions/:id/attendance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { attendees } = req.body;
    
    if (!Array.isArray(attendees)) {
      return res.status(400).json({ error: 'Attendees must be an array' });
    }
    
    const data = await readData();
    const sessionIndex = data.sessions.findIndex(s => s.id === id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    data.sessions[sessionIndex].attendees = attendees;
    await writeData(data);
    await logAudit('UPDATE_ATTENDANCE', {
      sessionId: id,
      attendees
    }, req.session.username);
    
    res.json(data.sessions[sessionIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// GET /api/export/csv - Generate and return a CSV file of all session attendance data
app.get('/api/export/csv', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    
    // Create CSV header
    let csv = 'Session Date,Session Description,Attended Member Codes\n';
    
    // Add rows for each session and attendee
    data.sessions.forEach(session => {
      if (session.attendees.length === 0) {
        // Include sessions with no attendees
        csv += `"${session.date}","${session.description}",""\n`;
      } else {
        session.attendees.forEach(attendeeCode => {
          csv += `"${session.date}","${session.description}","${attendeeCode}"\n`;
        });
      }
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=volunteer_hours.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/audit-log - view full audit trail (super admin only)
app.get('/api/audit-log', requireSuperAdmin, async (req, res) => {
  try {
    const logData = await fs.readFile(AUDIT_LOG_FILE, 'utf8');
    res.json(JSON.parse(logData));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
