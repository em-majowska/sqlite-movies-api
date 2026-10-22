import express, { Request } from "express";
import db from "./database";
const app = express();
app.use(express.json());
// =========================================
// ================ DIRECTORS =================
// =========================================

app.get("/api/directors", (req, res) => {
  const directors = db.prepare(`SELECT * FROM directors`).all();
  res.json(directors);
});

app.get("/api/directors/:id", (req, res) => {
  const { id } = req.params;
  const director = db.prepare(`SELECT * FROM directors WHERE id = ?`).get(id);

  if (!director) {
    return res.status(404).json({ message: "Réalisateur non trouvé." });
  }
  res.json(director);
});

app.post("/api/directors", (req, res) => {
  try {
    const { name, country } = req.body;

    if (!name || !country) {
      return res.status(400).json({ message: "name et country sont requis" });
    }

    const result = db
      .prepare("INSERT INTO directors (name, country) VALUES (?,?)")
      .run(name, country);

    const director = db
      .prepare(`SELECT * FROM directors WHERE id = ?`)
      .get(result.lastInsertRowid);
    res.status(201).json(director);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Nom déjà utilisé" });
    }
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/durectirs/:id", (req, res) => {
  try {
    const { name, country } = req.body;
    const { id } = req.params;

    if (!name || !country) {
      return res.status(400).json({ message: "name et country sont requis" });
    }

    const result = db
      .prepare("UPDATE directors SET name = ?, country = ? WHERE id = ?")
      .run(name, country, id);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Réalisateur non trouvé." });
    }

    const director = db.prepare("SELECT * FROM directors WHERE id = ?").get(id);

    res.status(200).json(director);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Nom déjà utilisé" });
    }
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/directors/:id", (req, res) => {
  const { id } = req.params;

  // check if director has movies
  const movies = db
    .prepare(
      "SELECT COUNT(movies.id) AS movie_count FROM movies WHERE director_id = ?",
    )
    .all(id);

  if (movies.length > 0) {
    res.status(400).json({
      message: "Impossible de supprimer : ce réalisateur a des films",
    });
  }

  const result = db.prepare("DELETE FROM directors WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Réalisateur non trouvé." });
  }

  res.status(204).send();
});

// =========================================
// ================ MOVIES =================
// =========================================

// app.get("/api/movies", (req, res) => {
//   const movies = db
//     .prepare(
//       `SELECT movies.*, directors.name AS director
// 			FROM movies
// 			INNER JOIN directors ON movies.director_id = directors.id`,
//     )
//     .all();
//   res.status(200).json(movies);
// });

app.get(
  "/api/movies",
  (
    req: Request<
      {},
      {},
      {},
      {
        genre?: string;
        year?: number;
        sort?: "title" | "year";
        order?: "asc" | "desc";
      }
    >,
    res,
  ) => {
    const conditions: string[] = [];
    const params: any[] = [];
    let orderClause: string = "";

    if (req.query.genre) {
      conditions.push("movies.genre = ?");
      params.push(req.query.genre);
    }
    if (req.query.year) {
      conditions.push("movies.year = ?");
      params.push(req.query.year);
    }

    if (req.query.sort) {
      const allowedSorts = ["title", "year"];
      const sortBy = allowedSorts.includes(req.query.sort as string)
        ? `movies.${req.query.sort}`
        : "movies.created_at";

      const allowedOrders = ["asc", "desc"];
      const orderDirection = allowedOrders.includes(req.query.order as string)
        ? req.query.order!.toUpperCase()
        : "DESC";

      orderClause = `ORDER BY ${sortBy} ${orderDirection}`;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT movies.*, directors.name AS director FROM movies INNER JOIN directors ON movies.director_id = directors.id
			${where} ${orderClause}`;

    const movies = db.prepare(query).all(...params);
    res.status(200).json(movies);
  },
);

app.get("/api/movies/:id", (req, res) => {
  const { id } = req.params;
  const movie = db
    .prepare(
      `SELECT movies.*, directors.name AS director
			FROM movies
			INNER JOIN directors ON movies.director_id = directors.id
			WHERE movies.id = ?`,
    )
    .get(id);

  if (!movie) {
    return res.status(404).json({ message: "Film non trouvé." });
  }

  res.status(200).json(movie);
});

// Pourquoi LEFT JOIN et pas INNER JOIN pour les reviews ? Parce qu'un film peut ne pas avoir de critiques. Avec un INNER JOIN, un film sans critique ne serait pas retourné du tout. Le LEFT JOIN retourne le film même s'il n'a pas de critiques (les champs review seront null / 0).

app.get("/api/movies/:id/stats", (req, res) => {
  const { id } = req.params;
  const movie = db
    .prepare(
      `SELECT
      movies.title,
      directors.name AS director,
      COUNT(reviews.id) AS review_count,
      COALESCE(ROUND(AVG(reviews.rating)), 0) AS average_rating,
      COALESCE(MIN(reviews.rating), 0) AS min_rating,
      COALESCE(MAX(reviews.rating), 0) AS max_rating
			FROM movies
			INNER JOIN directors ON movies.director_id = directors.id
      LEFT JOIN reviews ON movies.id = reviews.movie_id
			WHERE movies.id = ?
			GROUP BY movies.id`,
    )
    .get(id);

  if (!movie) {
    return res.status(404).json({ message: "Film non trouvé." });
  }

  res.status(200).json(movie);
});

app.get("/api/directors/:id/movies", (req, res) => {
  const { id } = req.params;

  const director = db.prepare(`SELECT * FROM direcors WHERE id = ?`).get(id);
  if (!director) {
    return res.status(404).json({ message: "Réalisateur non trouvé." });
  }

  const movies = db
    .prepare(
      `SELECT movies.*, directors.name AS director
		FROM movies
		INNER JOIN directors ON movies.director_id = directors.id
		WHERE directors.id = ?`,
    )
    .all(id);

  res.status(200).json(movies);
});

app.post("/api/movies", (req, res) => {
  const { title, year, genre, director_id } = req.body;

  if (!title || !year || !genre || !director_id) {
    return res
      .status(400)
      .json({ message: "title, year, genre et director_id sont requis" });
  }

  try {
    // check if director exists
    const director = db
      .prepare("SELECT * FROM directors WHERE id = ?")
      .get(director_id);
    if (!director) {
      return res
        .status(400)
        .json({ message: "Réalisateur de cet identité n'existe pas." });
    }

    const result = db
      .prepare(
        `INSERT INTO movies (title, year, genre, director_id) VALUES (?, ?, ?, ?)`,
      )
      .run(title, year, genre, director_id);

    const movie = db
      .prepare("SELECT * FROM movies WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(movie);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/movies/:id", (req, res) => {
  const { id } = req.params;

  const result = db.prepare("DELETE FROM movies WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Film non trouvé." });
  }

  res.status(204).send();
});

// =========================================
// ================ REVIEWS =================
// =========================================

app.get("/api/movies/:id/reviews", (req, res) => {
  const { id } = req.params;

  const movie = db.prepare("SELECT id FROM movies WHERE id = ?").get(id);
  if (!movie) {
    return res.status(404).json({ message: "Film non trouvé." });
  }

  const reviews = db
    .prepare(
      "SELECT * FROM reviews WHERE movie_id = ? ORDER BY created_at DESC",
    )
    .all(id);

  res.status(200).json(reviews);
});

app.post("/api/reviews", (req, res) => {
  const { content, rating, movie_id, author } = req.body;

  if (!content || rating === undefined || !movie_id || !author) {
    return res
      .status(400)
      .json({ message: "content, rating, movie_id et author sont requis" });
  }

  // check if rating is between 1 - 5
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Le rating doit être un entier entre 1 et 5" });
  }

  // check if movie exists
  const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(movie_id);
  if (!movie) {
    return res
      .status(400)
      .json({ message: "Film de cet identité n'existe pas." });
  }

  const result = db
    .prepare(
      "INSERT INTO reviews (content, rating, movie_id, author) VALUES (?, ?, ?, ?)",
    )
    .run(content, rating, movie_id, author);

  const review = db
    .prepare("SELECT * FROM reviews WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(review);
});

app.delete("/api/reviews/:id", (req, res) => {
  const { id } = req.params;

  const result = db.prepare("DELETE FROM reviews WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Critique non trouvée." });
  }
  res.status(204).send();
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur movies-api démarré sur http://localhost:${PORT}`);
});
