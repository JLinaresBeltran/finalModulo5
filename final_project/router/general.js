const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

// Temporal storage for users
let registeredUsers = [];

// JWT secret key
const JWT_SECRET = "your_jwt_secret_key";

public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const userExists = registeredUsers.find(user => user.username === username);
  if (userExists) {
    return res.status(409).json({ message: "Username already exists." });
  }

  registeredUsers.push({ username, password });
  return res.status(201).json({ message: "User registered successfully." });
});

// User login to get token
public_users.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = registeredUsers.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  return res.status(200).json({ token });
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error("Authorization header is missing.");
    return res.status(401).json({ message: "Authorization header is missing." });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.error("Authorization header format is incorrect. Received:", authHeader);
    return res.status(401).json({ message: "Authorization header format is incorrect." });
  }

  const token = tokenParts[1];
  console.log("Received token:", token);

  if (typeof token !== 'string' || token.trim() === '') {
    console.error("Token is not a valid string.");
    return res.status(401).json({ message: "Token is not a valid string." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ message: "Invalid or expired token.", error: err.message });
    }
    console.log("Authenticated user:", user);
    req.user = user;
    next();
  });
};

// Get the book list available in the shop
public_users.get('/', (req, res) => {
  axios.get('http://localhost:5000/internal/books').then(response => {
    res.status(200).json(response.data);
  }).catch(error => {
    console.error("Error fetching book list:", error);
    res.status(500).json({ message: "Error fetching book list." });
  });
});

// Get book details by ISBN
public_users.get('/isbn/:isbn', (req, res) => {
  const isbn = req.params.isbn;
  axios.get(`http://localhost:5000/internal/books/${isbn}`).then(response => {
    res.status(200).json(response.data);
  }).catch(error => {
    console.error(`Error fetching details for ISBN ${isbn}:`, error);
    res.status(404).json({ message: "Book not found." });
  });
});

// Get books by author
public_users.get('/author/:author', (req, res) => {
  const author = req.params.author.toLowerCase();
  axios.get('http://localhost:5000/internal/books').then(response => {
    const filteredBooks = Object.values(response.data).filter(book => book.author.toLowerCase() === author);
    if (filteredBooks.length > 0) {
      res.status(200).json(filteredBooks);
    } else {
      res.status(404).json({ message: "No books found by this author." });
    }
  }).catch(error => {
    console.error(`Error fetching books by author ${author}:`, error);
    res.status(500).json({ message: "Error fetching books by author." });
  });
});

// Get books by title
public_users.get('/title/:title', (req, res) => {
  const title = req.params.title.toLowerCase();
  axios.get('http://localhost:5000/internal/books').then(response => {
    const filteredBooks = Object.values(response.data).filter(book => book.title.toLowerCase() === title);
    if (filteredBooks.length > 0) {
      res.status(200).json(filteredBooks);
    } else {
      res.status(404).json({ message: "No books found with this title." });
    }
  }).catch(error => {
    console.error(`Error fetching books by title ${title}:`, error);
    res.status(500).json({ message: "Error fetching books by title." });
  });
});

// Add or update a review for a book
public_users.put('/reviews/:isbn', authenticateToken, (req, res) => {
  const isbn = req.params.isbn;
  const { review } = req.body;

  if (!review) {
    return res.status(400).json({ message: "Review content is required." });
  }

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: "Book not found." });
  }

  const username = req.user.username;
  console.log(`User ${username} is adding/updating a review for book ${isbn}`);
  book.reviews[username] = review;
  return res.status(200).json({ message: "Review added/updated successfully.", reviews: book.reviews });
});

// Internal endpoint for fetching books (for simulation)
public_users.get('/internal/books', (req, res) => {
  return res.status(200).json(books);
});

module.exports.general = public_users;
