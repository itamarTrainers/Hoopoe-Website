const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123'; // Replace with a secure password

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Disable view caching for development
app.set('view cache', false);

// Set EJS as the view engine
app.set('view engine', 'ejs');

// HTTP Basic Authentication Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
  const [username, password] = auth.split(':');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic');
  return res.status(401).send('Invalid credentials.');
};

// Routes
app.get('/', (req, res) => res.render('index'));

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  const dataPath = path.join(__dirname, 'messages.json');

  try {
    // Read existing messages
    let messages = [];
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, 'utf8');
      messages = JSON.parse(fileData);
    }

    // Append the new message
    messages.push({ name, email, message, timestamp: new Date().toISOString() });

    // Write the updated messages to the file
    fs.writeFileSync(dataPath, JSON.stringify(messages, null, 2));

    console.log('Message saved successfully:', { name, email, message });

    // Respond with JSON success message
    res.json({ success: true, message: 'Message saved successfully.' });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ success: false, message: 'Failed to save your message. Please try again later.' });
  }
});

// Admin Page (Protected Route)
app.get('/admin', authenticate, (req, res) => {
  const dataPath = path.join(__dirname, 'messages.json');
  if (!fs.existsSync(dataPath)) {
    return res.send('<h1>No messages yet!</h1>');
  }

  res.render('admin', {
    messages: JSON.parse(fs.readFileSync(dataPath)),
  });
});

// Download Messages (Protected Route)
app.get('/admin/download', authenticate, (req, res) => {
  const dataPath = path.join(__dirname, 'messages.json');
  if (!fs.existsSync(dataPath)) {
    return res.status(404).send('No messages to download.');
  }

  res.download(dataPath, 'messages.json', (err) => {
    if (err) {
      console.error('Error sending the file:', err);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
