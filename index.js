const express = require('express');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Create a workout session
app.post('/api/workouts', async (req, res) => {
    try {
        const { title, workout_date } = req.body;
        // Parameterized queries ($1, $2) safeguard against SQL injection
        const result = await db.query(
            'INSERT INTO workouts (title, workout_date) VALUES ($1, $2) RETURNING *',
            [title, workout_date || new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Fetch all workouts with total exercise counts (Aggregations)
app.get('/api/workouts', async (req, res) => {
    try {
        const query = `
      SELECT 
        w.id, 
        w.title, 
        w.workout_date, 
        COUNT(e.id)::int AS total_exercises
      FROM workouts w
      LEFT JOIN exercises e ON w.id = e.workout_id
      GROUP BY w.id
      ORDER BY w.workout_date DESC;
    `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Fetch a single workout with all exercises nested as a JSON array
app.get('/api/workouts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        w.id, 
        w.title, 
        w.workout_date,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'sets', e.sets,
              'reps', e.reps,
              'weight', e.weight
            )
          ) FILTER (WHERE e.id IS NOT NULL), '[]'
        ) AS exercises
      FROM workouts w
      LEFT JOIN exercises e ON w.id = e.workout_id
      WHERE w.id = $1
      GROUP BY w.id;
    `;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workout not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Add an exercise to a workout (Foreign key relation)
app.post('/api/workouts/:id/exercises', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sets, reps, weight } = req.body;

        const result = await db.query(
            `INSERT INTO exercises (workout_id, name, sets, reps, weight)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, name, sets, reps, weight]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Update an exercise's stats
app.put('/api/exercises/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sets, reps, weight } = req.body;

        const result = await db.query(
            `UPDATE exercises 
       SET sets = COALESCE($1, sets),
           reps = COALESCE($2, reps),
           weight = COALESCE($3, weight)
       WHERE id = $4
       RETURNING *`,
            [sets, reps, weight, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Delete a workout (cascades to exercises automatically)
app.delete('/api/workouts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM workouts WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Workout not found' });
        }

        res.json({ message: 'Workout deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));