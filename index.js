const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return { members: [], sessions: [] };
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateMemberCode(name, existingCodes) {
  const cleanName = name.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  let code = '';
  if (words.length === 1) {
    code = words[0].substring(0, 6);
  } else if (words.length >= 2) {
    const firstName = words[0];
    const lastInitial = words[words.length - 1].charAt(0);
    code = (firstName.substring(0, 5) + lastInitial).substring(0, 6);
  }
  let finalCode = code;
  let counter = 1;
  while (existingCodes.includes(finalCode)) {
    finalCode = code + counter;
    counter++;
  }
  return finalCode;
}

app.get('/api/members', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    const data = await readData();
    const existingCodes = data.members.map(m => m.code);
    const code = generateMemberCode(name.trim(), existingCodes);
    const newMember = { name: name.trim(), code };
    data.members.push(newMember);
    await writeData(data);
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});