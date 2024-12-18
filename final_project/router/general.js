const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

// Path to users.json
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper function to read users from file
const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error("Error reading users file:", error);
    return [];
  }
};

// Helper function to write users to file
const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error writing to users file:", error);
  }
};

public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const registeredUsers = readUsers();
  const userExists = registeredUsers.find(user => user.username === username);
  if (userExists) {
    return res.status(409).json({ message: "Username already exists." });
  }

  registeredUsers.push({ username, password });
  writeUsers(registeredUsers);
  return res.status(201).json({ message: "User registered successfully." });
});

// Login route
public_users.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const registeredUsers = readUsers();
  const user = registeredUsers.find(user => user.username === username && user.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const token = jwt.sign({ username }, "secret123", { expiresIn: "1h" });
  return res.status(200).json({ message: "Login successful", token });
});

// Get the book list available in the shop
public_users.get('/', function (req, res) {
  return res.status(200).json(books);
});

// Get book details by ISBN
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) {
    return res.status(200).json(book);
  } else {
    return res.status(404).json({message: "Book not found"});
  }
});

// Get books by author
public_users.get('/author/:author', function (req, res) {
  const author = req.params.author.toLowerCase();
  const filteredBooks = Object.values(books).filter(book => book.author.toLowerCase() === author);
  if (filteredBooks.length > 0) {
    return res.status(200).json(filteredBooks);
  } else {
    return res.status(404).json({message: "No books found by this author"});
  }
});

// Get books by title
public_users.get('/title/:title', function (req, res) {
  const title = req.params.title.toLowerCase();
  const filteredBooks = Object.values(books).filter(book => book.title.toLowerCase() === title);
  if (filteredBooks.length > 0) {
    return res.status(200).json(filteredBooks);
  } else {
    return res.status(404).json({message: "No books found with this title"});
  }
});

// Get reviews of a book by ISBN
public_users.get('/reviews/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) {
    return res.status(200).json(book.reviews);
  } else {
    return res.status(404).json({message: "Book not found"});
  }
});

module.exports.general = public_users;
