import express from "express";
import cors from "cors";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Pool } = pkg;

// Load database config from JSON file
const configPath = join(__dirname, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const pool = new Pool({
  user: config.database.user,
  host: config.database.host,
  database: config.database.database,
  password: config.database.password,
  port: config.database.port
});

//Express server configuration and Deepgram client setup
const app = express();
const port = 5010;

// Middleware setup
app.use(cors());
app.use(express.json());

// Update the save-post endpoint
app.post("/save-post", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      followup,
      coverage,
      time,
      application_deadline,
      test_start_date,
      panel_members,
      post_stage
    } = req.body;

    // Ensure panel_members is always treated as an array
    const panelArray = Array.isArray(panel_members) ? panel_members : [];
    const panelString = panelArray.join(',');

    const postQuery = `
      INSERT INTO post (
        title, description, minimum_experience, category,
        exam_type, followup, coverage, time,
        application_deadline, test_start_date, panel_id,
        status, exam_status, post_stage, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING post_id`;

    const postValues = [
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      exam_type === 'MCQ' ? null : followup,
      exam_type === 'MCQ' ? null : coverage,
      time,
      application_deadline,
      test_start_date,
      panelString,
      'active',
      'pending',
      post_stage || 1
    ];

    const result = await client.query(postQuery, postValues);
    const newPostId = result.rows[0].post_id;

    // After creating the post, notify candidates
    try {
      const response = await fetch('http://localhost:5005/update-candidates-new-recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedCandidates: req.body.selectedCandidates || [],
          newPostId: newPostId,
          oldPostId: req.body.oldPostId,
          title: title,
          stage: post_stage
        })
      });

      if (!response.ok) {
        console.error('Warning: Failed to send notifications to candidates');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Post created successfully and notifications sent',
      post_id: newPostId,
      panel_members: panelArray
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving post:', error);
    res.status(500).json({
      error: 'Failed to save post',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Add this new endpoint for updating candidate job_ids
app.post("/update-candidates-job", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { selectedCandidates, notSelectedCandidates } = req.body;

    // Update selected candidates with new job_id
    for (const candidate of selectedCandidates) {
      await client.query(`
        UPDATE candidate 
        SET job_id = $1,
            selected = 'Yes'::select_status,
            progress = 'Applied'::interview_progress
        WHERE candidate_id = $2
      `, [candidate.newJobId, candidate.candidate_id]);
    }

    // Update not selected candidates
    for (const candidate of notSelectedCandidates) {
      await client.query(`
        UPDATE candidate 
        SET job_id = NULL,
            selected = 'No'::select_status
        WHERE candidate_id = $1 AND job_id = $2
      `, [candidate.candidate_id, candidate.currentJobId]);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Candidates updated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating candidates:', error);
    res.status(500).json({
      error: 'Failed to update candidates',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Update the delete-post endpoint
app.delete("/delete-post/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const postId = req.params.id;

        // First, update questions to remove the job_id reference and reset notify status
        const updateQuestionsQuery = `
            UPDATE question 
            SET job_id = NULL,
                notify = false
            WHERE job_id = $1`;
        await client.query(updateQuestionsQuery, [postId]);

        // Then delete the post
        const deletePostQuery = 'DELETE FROM post WHERE post_id = $1 RETURNING *';
        const result = await client.query(deletePostQuery, [postId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'Post not found'
            });
        }

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Post and related question references deleted successfully',
            deletedPost: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting post:', error);
        res.status(500).json({
            error: 'Failed to delete post',
            details: error.message
        });
    } finally {
        client.release();
    }
});

  //To update post
  app.put("/update-post/:id", async (req, res) => {
    try {
      const postId = req.params.id;
      const {
        title,
        description,
        minimum_experience,
        category,
        exam_type,
        followup,
        coverage,
        time,
        application_deadline,
        test_start_date
      } = req.body;
  
      const query = `
        UPDATE post 
        SET title = $1,
            description = $2,
            minimum_experience = $3,
            category = $4,
            exam_type = $5,
            followup = $6,
            coverage = $7,
            time = $8,
            application_deadline = $9,
            test_start_date = $10
        WHERE post_id = $11
        RETURNING *`;
  
      const values = [
        title,
        description,
        minimum_experience,
        category,
        exam_type,
        followup,
        coverage,
        time,
        application_deadline,
        test_start_date,
        postId
      ];
  
      const result = await pool.query(query, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Post not found'
        });
      }
  
      res.status(200).json({
        message: 'Post updated successfully',
        post: result.rows[0]
      });
  
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({
        error: 'Failed to update post',
        details: error.message
      });
    }
  });

// Update the GET posts endpoint
app.get("/post", async (req, res) => {
    try {
      const query = `
        SELECT p.*, 
               p.panel_id as panel_members,
               p.status,
               p.exam_status,
               p.post_stage
        FROM post p 
        ORDER BY p.created_at DESC`;
        
      const result = await pool.query(query);
      
      const transformedResults = result.rows.map(post => {
        const panelMembers = post.panel_id ? post.panel_id.split(',') : [];
        return {
          ...post,
          panel_members: panelMembers,
          panel: panelMembers
        };
      });
      
      res.json(transformedResults);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({
        error: 'Failed to fetch posts',
        details: error.message
      });
    }
});

// endpoint to fetch panel members
app.get("/panel-members", async (req, res) => {
    try {
      const query = `
        SELECT id, username 
        FROM users 
        WHERE user_role = 'Panel'
        ORDER BY username`;
      
      const result = await pool.query(query);
      
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching panel members:', error);
      res.status(500).json({
        error: 'Failed to fetch panel members',
        details: error.message
      });
    }
  });

// Add update-panel endpoint
app.put("/update-panel", async (req, res) => {
  const client = await pool.connect();
  try {
    const { post_id, panels } = req.body;

    // Convert panels array to comma-separated string
    const panelString = Array.isArray(panels) ? panels.join(',') : '';

    const query = `
      UPDATE post 
      SET panel_id = $1
      WHERE post_id = $2
      RETURNING *`;

    const result = await client.query(query, [panelString, post_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    res.status(200).json({
      message: 'Panel members updated successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating panel members:', error);
    res.status(500).json({
      error: 'Failed to update panel members',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Update the recruitment stage endpoint
app.post("/api/update-recruitment-stage", async (req, res) => {
  const client = await pool.connect();
  try {
    const { oldPostId, newPostId, selectedCandidates, jobTitle, stage } = req.body;

    await client.query('BEGIN');

    // 1. Reset question table entries for old post
    await client.query(`
      UPDATE question 
      SET job_id = NULL,
          notify = false,
          question_start = 'No'::question_start_enum
      WHERE job_id = $1
    `, [oldPostId]);

    // 2. Update candidates table for selected candidates
    await client.query(`
      UPDATE candidate 
      SET job_id = $1,
          selected = 'No'::select_status,
          progress = 'Applied'::interview_progress
      WHERE candidate_id = ANY($2::int[])
    `, [newPostId, selectedCandidates]);

    // 3. Clear job_id for non-selected candidates
    await client.query(`
      UPDATE candidate 
      SET job_id = NULL,
          selected = 'No'::select_status
      WHERE job_id = $1 
      AND candidate_id != ALL($2::int[])
    `, [oldPostId, selectedCandidates]);

    // 4. Delete the old post
    await client.query(`
      DELETE FROM post 
      WHERE post_id = $1
    `, [oldPostId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Recruitment stage updated successfully"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating recruitment stage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    client.release();
  }
});

// Add endpoint to get single post by ID
app.get("/posts/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.*,
        p.panel_id as panel_members,
        p.status,
        p.exam_status,
        p.post_stage
      FROM post p
      WHERE p.post_id = $1`;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    // Transform the result to include panel members array
    const post = result.rows[0];
    const panelMembers = post.panel_id ? post.panel_id.split(',') : [];
    const transformedPost = {
      ...post,
      panel_members: panelMembers,
      panel: panelMembers
    };

    res.json(transformedPost);

  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      error: 'Failed to fetch post details',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Update or add this endpoint
app.get('/api/hiring-questions', async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        q.*,
        p.post_id,
        p.title as job_title,
        p.exam_type,
        p.test_start_date,
        p.post_stage,
        p.panel_id,
        (
          SELECT json_agg(c.*)
          FROM candidate c
          WHERE c.job_id = p.post_id
        ) as candidates
      FROM questions q
      JOIN post p ON q.post_id = p.post_id
      ORDER BY p.created_at DESC
    `;

    const result = await client.query(query);
    res.json({
      status: 'success',
      questions: result.rows
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch questions'
    });
  } finally {
    client.release();
  }
});

//Start Server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });