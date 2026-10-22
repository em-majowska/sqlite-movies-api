import db from "./database";

const directors = [
  { name: "Christopher Nolan", country: "UK" },
  { name: "Quentin Tarantino", country: "USA" },
  { name: "Hayao Miyazaki", country: "Japan" },
];

const movies = [
  { title: "Inception", year: 2010, genre: "Sci-Fi", director_id: 1 },
  { title: "Pulp Fiction", year: 1994, genre: "Crime", director_id: 2 },
  { title: "Spirited Away", year: 2001, genre: "Animation", director_id: 3 },
  { title: "Interstellar", year: 2014, genre: "Sci-Fi", director_id: 1 },
];

const reviews = [
  { content: "Chef-d'œuvre absolu", rating: 5, movie_id: 1, author: "alice" },
  { content: "Un classique", rating: 4, movie_id: 2, author: "bob" },
  { content: "Magnifique animation", rating: 5, movie_id: 3, author: "alice" },
  { content: "Un peu long", rating: 3, movie_id: 4, author: "charlie" },
];

const seedDb = db.transaction(() => {
  // Nettoyage dans l'ordre inverse des dépendances
  db.prepare("DELETE FROM reviews").run();
  db.prepare("DELETE FROM movies").run();
  db.prepare("DELETE FROM directors").run();

  const insertDirector = db.prepare(
    "INSERT INTO directors (name, country) VALUES (?, ?)",
  );
  const insertMovie = db.prepare(
    "INSERT INTO movies (title, year, genre, director_id) VALUES (?, ?, ?, ?)",
  );
  const insertReview = db.prepare(
    "INSERT INTO reviews (content, rating, movie_id, author) VALUES (?, ?, ?, ?)",
  );

  for (const director of directors) {
    insertDirector.run(director.name, director.country);
  }
  for (const movie of movies) {
    insertMovie.run(movie.title, movie.year, movie.genre, movie.director_id);
  }

  for (const review of reviews) {
    insertReview.run(
      review.content,
      review.rating,
      review.movie_id,
      review.author,
    );
  }
});

try {
  seedDb();
  console.log("Database seeded successfully.");
} catch (error) {
  console.log("Error seeding database:", error);
}
