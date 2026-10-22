import Database from "better-sqlite3";
const db = new Database("movies.sqlite");

db.exec(`CREATE TABLE IF NOT EXISTS directors (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL UNIQUE,
country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT NOT NULL,
year INTEGER NOT NULL,
genre TEXT NOT NULL,
director_id INTEGER NOT NULL,
created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
id INTEGER PRIMARY KEY AUTOINCREMENT,
content TEXT NOT NULL,
rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
movie_id INTEGER NOT NULL,
author TEXT NOT NULL,
created_at DEFAULT CURRENT_TIMESTAMP
);`);

export default db;
