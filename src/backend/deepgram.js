import express from "express";
import cors from "cors";
import { createClient } from "@deepgram/sdk";
import fs from 'fs/promises';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Pool } = pkg;

// Add PostgreSQL connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // replace with your database name
  password: 'admin', // replace with your password
  port: 5432,
});

// First, add the unique constraint to the database
const addUniqueConstraint = `
  ALTER TABLE interviews 
  ADD CONSTRAINT unique_interview_stage 
  UNIQUE (candidate_id, post_id, interview_stage);
`;

//Express server configuration and Deepgram client setup
const app = express();
const port = 5005;
const deepgram = createClient("dade834708f60340f515b0565846da91c7b7d745");

// Middleware setup
app.use(cors());
app.use(express.json());

// Add this new endpoint to update candidate post_ids
app.post('/update-candidate-posts', async (req, res) => {
  try {
    const { candidateIds, newPostId } = req.body;

    const query = `
      UPDATE candidate
      SET post_id = $1
      WHERE candidate_id = ANY($2::int[])
      RETURNING *
    `;

    const result = await pool.query(query, [newPostId, candidateIds]);
    res.json({ updated: result.rows });

  } catch (error) {
    console.error('Error updating candidate posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update save-conversation endpoint
app.post("/save-conversation", async (req, res) => {
  try {
    const { conversation, candidateName, candidateId, postId } = req.body;
   
    if (!conversation || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update or insert conversation in interviews table
    const query = `
      UPDATE interviews 
      SET interview_response = $1::jsonb
      WHERE candidate_id = $2 
      AND post_id = $3 
      AND interview_stage = 2
      RETURNING interview_id`;

    const result = await pool.query(query, [conversation, candidateId, postId]);
    
    if (result.rows.length === 0) {
      // If no existing record, insert new one
      const insertQuery = `
        INSERT INTO interviews (
          candidate_id, 
          post_id, 
          interview_stage, 
          interview_response
        )
        VALUES ($1, $2, 2, $3::jsonb)
        RETURNING interview_id`;

      const insertResult = await pool.query(insertQuery, [
        candidateId, 
        postId, 
        conversation
      ]);

      res.status(201).json({
        message: 'Conversation saved successfully',
        interviewId: insertResult.rows[0].interview_id
      });
    } else {
      res.status(200).json({
        message: 'Conversation updated successfully',
        interviewId: result.rows[0].interview_id
      });
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({
      error: 'Failed to save conversation',
      details: error.message
    });
  }
});

// Update save-rankings endpoint
app.post("/save-rankings", async (req, res) => {
  try {
    const { rankings, candidateId, postId } = req.body;
    
    if (!rankings || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const rankingsData = {
      scores: {
        fluency: rankings[0],
        subjectKnowledge: rankings[1],
        professionalBehavior: rankings[2]
      },
      feedback: rankings[3],
      timestamp: new Date().toISOString()
    };

    const query = `
      UPDATE interviews 
      SET interview_performance = $1::jsonb
      WHERE candidate_id = $2 
      AND post_id = $3 
      AND interview_stage = 2
      RETURNING interview_id`;

    const result = await pool.query(query, [rankingsData, candidateId, postId]);
    
    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO interviews (
          candidate_id, 
          post_id, 
          interview_stage, 
          interview_performance
        )
        VALUES ($1, $2, 2, $3::jsonb)
        RETURNING interview_id`;

      const insertResult = await pool.query(insertQuery, [
        candidateId, 
        postId, 
        rankingsData
      ]);

      res.status(201).json({
        message: 'Rankings saved successfully',
        interviewId: insertResult.rows[0].interview_id
      });
    } else {
      res.status(200).json({
        message: 'Rankings updated successfully',
        interviewId: result.rows[0].interview_id
      });
    }
  } catch (error) {
    console.error('Error saving rankings:', error);
    res.status(500).json({
      error: 'Failed to save rankings',
      details: error.message
    });
  }
});

// Update get-conversation endpoint
app.get('/get-conversation/:postId/:candidateId', async (req, res) => {
  try {
    const { postId, candidateId } = req.params;
    
    const query = `
      SELECT interview_response
      FROM interviews
      WHERE post_id = $1 
      AND candidate_id = $2
      AND interview_stage = 2
      AND interview_response IS NOT NULL`;

    const result = await pool.query(query, [postId, candidateId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error reading conversation:', err);
    res.status(500).json({ error: 'Failed to read conversation' });
  }
});

// For conversations endpoint
app.get('/get-conversation/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.candidate_id,
        c.name as candidate_name,
        i.interview_response,
        i.interview_performance,
        i.createdat
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 
      AND i.interview_stage = 2
      AND i.interview_response IS NOT NULL
      AND i.report_to_hr = 'yes'
      ORDER BY i.createdat DESC
    `;

    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.json([]); // Return empty array instead of 404
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-mcq-results/:postId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.mcq_response,
        i.createdat as date,
        c.name as candidate_name,
        c.candidate_id,
        c.candidate_level,
        i.interview_stage
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 
      AND i.interview_stage = 1
      AND i.mcq_response IS NOT NULL
      ORDER BY i.createdat DESC
    `;

    const result = await client.query(query, [postId]);
    console.log('Query result:', result.rows);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    // Format the response
    const formattedResults = result.rows.map(row => ({
      _id: `${row.candidate_id}_${row.date.toISOString()}`,
      candidateId: row.candidate_id,
      candidateName: row.candidate_name,
      candidateLevel: row.candidate_level,
      date: row.date,
      mcqResponses: row.mcq_response?.mcqResponses || []
    }));

    console.log('Formatted results:', formattedResults);
    res.json(formattedResults);

  } catch (error) {
    console.error('Error fetching MCQ results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch MCQ results',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Update the get-rankings endpoint
app.get('/get-rankings/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.candidate_id as "candidateId",
        c.name as "candidateName",
        c.candidate_level as "candidateLevel",
        i.interview_performance,
        i.createdat as date,
        i.report_to_hr as "reportToHr"
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 
      AND i.interview_stage = 2
      AND i.interview_performance IS NOT NULL
      ORDER BY i.createdat DESC`;

    const result = await pool.query(query, [postId]);
    
    const rankings = result.rows.map(row => ({
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      candidateLevel: row.candidateLevel,
      interview_performance: row.interview_performance,
      date: row.date,
      reportToHr: row.reportToHr
    }));

    console.log('Sending rankings:', rankings);
    res.json(rankings);

  } catch (error) {
    console.error('Error reading rankings:', error);
    res.status(500).json({ error: 'Failed to get rankings' });
  }
});

// For rankings endpoint
app.get('/get-rankings/:postId/:date', async (req, res) => {
  try {
    const { postId } = req.params;
    const dirPath = path.join(__dirname, 'rankings', `post_${postId}`);
    
    // Check if directory exists using try/catch with fs.access
    try {
      await fs.access(dirPath);
    } catch (error) {
      console.log('Directory not found:', dirPath);
      return res.json([]);
    }

    const files = await fs.readdir(dirPath);
    const rankings = [];

    for (const file of files) {
      if (!file.endsWith('_review.json')) { // Skip review files
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const ranking = JSON.parse(content);
        
        // Try to find corresponding review file
        const reviewPath = path.join(dirPath, file.replace('.json', '_review.json'));
        try {
          await fs.access(reviewPath);
          const reviewContent = await fs.readFile(reviewPath, 'utf8');
          ranking.panelReview = JSON.parse(reviewContent);
        } catch (err) {
          // No review file exists, continue without it
        }
        
        rankings.push(ranking);
      }
    }

    res.json(rankings);
  } catch (err) {
    console.error('Error reading rankings:', err);
    res.status(500).json({ error: 'Failed to read rankings' });
  }
});

app.get('/get-rankings/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Construct the directory path
    const rankingsDir = path.join(
      process.cwd(),
      'rankings',
      `post_${postId}`
    );
    
    console.log('Looking for rankings in directory:', rankingsDir);

    // Check if directory exists
    try {
      await fs.access(rankingsDir);
    } catch (error) {
      console.log('Directory not found, returning empty array');
      return res.json([]);
    }

    // Read all files in the directory
    const files = await fs.readdir(rankingsDir);
    console.log('Found files:', files);

    // Read and parse each JSON file
    const rankings = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          const filePath = path.join(rankingsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content);
        })
    );

    console.log('Sending rankings:', rankings);
    res.json(rankings);
  } catch (error) {
    console.error('Error reading rankings:', error);
    res.status(500).json({ 
      error: 'Failed to get rankings',
      details: error.message 
    });
  }
});

// Update the update-panel-review endpoint
app.put("/update-panel-review", async (req, res) => {
  try {
    const { candidateName, date, review, postId } = req.body;
    
    // Get the candidate ID and update the interview_performance
    const query = `
      UPDATE interviews i
      SET interview_performance = jsonb_set(
        COALESCE(i.interview_performance, '{}'::jsonb),
        '{panelReview}',
        $1::jsonb
      )
      FROM candidate c
      WHERE i.candidate_id = c.candidate_id
      AND c.name = $2
      AND i.post_id = $3
      AND i.interview_stage = 2
      RETURNING i.interview_performance
    `;
    
    const result = await pool.query(query, [
      JSON.stringify(review),
      candidateName,
      postId
    ]);
     
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Interview record not found' 
      });
    }

    res.status(200).json({
      message: 'Panel review updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating panel review:', error);
    res.status(500).json({
      error: 'Failed to update panel review',
      details: error.message
    });
  }
});

// Update get-rankings endpoint to filter by postId
app.get("/get-rankings/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const rankingsDir = path.join(process.cwd(), 'rankings');
    const postPath = path.join(rankingsDir, `post_${postId}`);
    
    // Check if post directory exists
    try {
      await fs.access(postPath);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    
    const files = await fs.readdir(postPath);
    
    // Get rankings from each file in the post directory
    const postRankings = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const content = await fs.readFile(path.join(postPath, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            return null;
          }
        })
    );
    
    // Filter out null results and format for response
    const formattedRankings = postRankings
      .filter(ranking => ranking !== null)
      .map(ranking => ({
        candidateName: ranking.candidateName,
        candidateId: ranking.candidateId,
        postId: ranking.postId,
        date: ranking.date,
        scores: ranking.scores,
        feedback: ranking.feedback,
        panelReview: ranking.panelReview
      }));

    res.json(formattedRankings);
  } catch (error) {
    console.error('Error reading rankings:', error);
    res.status(500).json({
      error: 'Failed to fetch rankings',
      details: error.message
    });
  }
});

// Update the save-mcq endpoint
app.post("/save-mcq", async (req, res) => {
  const client = await pool.connect();
  try {
    const { mcqResponses, candidateId, postId } = req.body;

    // Validate required fields
    if (!mcqResponses || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query('BEGIN');

    // Get candidate name from database
    const candidateQuery = `
      SELECT name FROM candidate WHERE candidate_id = $1
    `;
    const candidateResult = await client.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      throw new Error('Candidate not found');
    }

    // Format MCQ responses for database storage
    const mcqData = {
      candidateName: candidateResult.rows[0].name,
      candidateId,
      postId,
      date: new Date().toISOString(),
      mcqResponses
    };

    // Insert or update MCQ response without setting progress
    const query = `
      INSERT INTO interviews (
        candidate_id, 
        post_id, 
        interview_stage, 
        mcq_response,
        selected,
        report_to_hr
      )
      VALUES ($1, $2, 1, $3::jsonb, 'no', 'no')
      ON CONFLICT (candidate_id, post_id, interview_stage) 
      DO UPDATE SET 
        mcq_response = $3::jsonb
      RETURNING interview_id;
    `;

    const result = await client.query(query, [
      candidateId,
      postId,
      JSON.stringify(mcqData)
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      message: "MCQ responses saved successfully",
      interviewId: result.rows[0].interview_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error saving MCQ responses:", error);
    res.status(500).json({
      error: "Failed to save MCQ responses",
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Update get-mcq-response endpoint
app.get('/get-mcq-response/:postId/:candidateId', async (req, res) => {
  try {
    const { postId, candidateId } = req.params;
    
    const query = `
      SELECT 
        i.mcq_response,
        i.candidate_id,
        i.createdat as date
      FROM interviews i
      WHERE i.post_id = $1 
      AND i.candidate_id = $2
      AND i.interview_stage = 1
      AND i.mcq_response IS NOT NULL
    `;

    const result = await pool.query(query, [postId, candidateId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'MCQ response not found' });
    }

    const response = {
      ...result.rows[0].mcq_response,
      candidateId: result.rows[0].candidate_id,
      date: result.rows[0].date,
      _id: `${result.rows[0].candidate_id}_${result.rows[0].date.toISOString()}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error reading MCQ response:', error);
    res.status(500).json({ 
      error: 'Failed to get MCQ response',
      details: error.message 
    });
  }
});

// Update the get-candidate-info endpoint
app.get("/get-candidate-info/:candidateId", async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // First get candidate name and post_id from candidate table
    const candidateQuery = `
      SELECT 
        c.name as candidateName,
        c.job_id as postId
      FROM candidate c
      WHERE c.candidate_id = $1
    `;
    
    const candidateResult = await pool.query(candidateQuery, [parseInt(candidateId, 10)]);
    
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "Candidate not found" 
      });
    }

    // Then check for an existing interview
    const interviewQuery = `
      SELECT post_id, progress
      FROM interviews
      WHERE candidate_id = $1
      AND interview_stage = 2
      AND (progress IS NULL OR progress != 'Completed')
      ORDER BY createdat DESC
      LIMIT 1
    `;
    
    const interviewResult = await pool.query(interviewQuery, [parseInt(candidateId, 10)]);
    
    // Use post_id from interview if it exists, otherwise use the one from candidate
    const finalPostId = interviewResult.rows.length > 0 
      ? interviewResult.rows[0].post_id 
      : candidateResult.rows[0].postid;

    console.log('Found candidate info:', {
      candidateName: candidateResult.rows[0].candidatename,
      postId: finalPostId,
      hasExistingInterview: interviewResult.rows.length > 0
    });

    res.json({
      candidateName: candidateResult.rows[0].candidatename,
      postId: finalPostId
    });

  } catch (error) {
    console.error('Error fetching candidate info:', error);
    res.status(500).json({ error: "Failed to fetch candidate information" });
  }
});

//Convert text to speech using Deepgram API
app.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;
    
    // Request speech synthesis from Deepgram
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-asteria-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    // Get audio stream and convert to buffer
    const stream = await response.getStream();
    const buffer = await getAudioBuffer(stream);

    // Set proper headers for audio streaming
    res.set({
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });

    res.send(buffer);
  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).send("Error generating audio");
  }
});

//Convert ReadableStream to Buffer
const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  // Read all chunks from the stream
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks into a single Uint8Array
  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

// Add save-post endpoint
app.post("/save-post", async (req, res) => {
  try {
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
      INSERT INTO post (
        title, description, minimum_experience, category,
        exam_type, followup, coverage, time,
        application_deadline, test_start_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING post_id`;

    const values = [
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      exam_type === 'MCQ' ? null : followup,
      exam_type === 'MCQ' ? null : coverage,
      time,
      application_deadline,
      test_start_date
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'Post created successfully',
      post_id: result.rows[0].post_id
    });

  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({
      error: 'Failed to save post',
      details: error.message
    });
  }
});

// Add delete-post endpoint
app.delete("/delete-post/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // Delete the post from the database
    const query = 'DELETE FROM post WHERE post_id = $1 RETURNING *';
    const result = await pool.query(query, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    res.status(200).json({
      message: 'Post deleted successfully',
      deletedPost: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      details: error.message
    });
  }
});

// Add endpoint to fetch panel members
app.get("/panel-members", async (req, res) => {
  try {
    const query = `
      SELECT userid, username 
      FROM users 
      WHERE role = 'panel'
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
  try {
    const { post_id, panels, exam_type } = req.body;

    // Validate panels based on exam type
    if (!Array.isArray(panels)) {
      return res.status(400).json({ 
        error: 'Invalid panel data. Panels must be an array.' 
      });
    }

    if (exam_type === 'MCQ' && panels.length !== 1) {
      return res.status(400).json({ 
        error: 'MCQ posts require exactly 1 panel member.' 
      });
    }

    if (exam_type !== 'MCQ' && panels.length !== 3) {
      return res.status(400).json({ 
        error: 'Interview posts require exactly 3 panel members.' 
      });
    }

    // Join panels with comma to store in database
    const panelString = panels.join(',');

    const query = `
      UPDATE post
      SET panel_id = $1
      WHERE post_id = $2
      RETURNING *`;

    const result = await pool.query(query, [panelString, post_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({
      message: 'Panels assigned successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating panels:', error);
    res.status(500).json({
      error: 'Failed to update panels',
      details: error.message
    });
  }
});

// Add endpoint to get all posts
app.get("/posts", async (req, res) => {
  try {
    const query = 'SELECT * FROM post ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      details: error.message
    });
  }
});

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

// Add new endpoint to save feedback
app.post("/save-mcq-feedback", async (req, res) => {
  try {
    const { interviewId, feedback } = req.body;

    const query = `
      UPDATE interviews
      SET interview_feedback = $1
      WHERE interview_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [feedback, interviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.status(200).json({
      message: "Feedback saved successfully",
      interview: result.rows[0]
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({
      error: "Failed to save feedback",
      details: error.message
    });
  }
});

 // Update save-interview endpoint
app.post("/save-interview", async (req, res) => {
  try {
    const {
      candidateId,
      postId,
      interviewStage,
      selected,
      report_to_hr,
      interviewFeedback
    } = req.body;

    // Check if an interview entry already exists
    const checkQuery = `
      SELECT interview_id 
      FROM interviews 
      WHERE candidate_id = $1 
      AND post_id = $2 
      AND interview_stage = $3
    `;
    
    const existingInterview = await pool.query(checkQuery, [candidateId, postId, interviewStage]);

    if (existingInterview.rows.length > 0) {
      // Update existing interview
      const updateQuery = `
        UPDATE interviews 
        SET interview_feedback = COALESCE($1, interview_feedback),
            selected = $2,
            report_to_hr = $3,
            createdat = CURRENT_TIMESTAMP
        WHERE interview_id = $4
        RETURNING interview_id
      `;

      const result = await pool.query(updateQuery, [
        interviewFeedback || null,
        selected || 'no',
        report_to_hr || 'no',
        existingInterview.rows[0].interview_id
      ]);

      return res.status(200).json({
        message: "Interview data updated successfully",
        interviewId: result.rows[0].interview_id
      });
    }

    // Insert new interview
    const insertQuery = `
      INSERT INTO interviews (
        candidate_id,
        post_id,
        interview_stage,
        interview_feedback,
        selected,
        report_to_hr
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING interview_id
    `;

    const values = [
      candidateId,
      postId,
      interviewStage,
      interviewFeedback || null,
      selected || 'no',
      report_to_hr || 'no'
    ];

    const result = await pool.query(insertQuery, values);

    res.status(200).json({
      message: "Interview data saved successfully",
      interviewId: result.rows[0].interview_id
    });
  } catch (error) {
    console.error("Error saving interview:", error);
    res.status(500).json({
      error: "Failed to save interview",
      details: error.message
    });
  }
});

// Add save-interview-feedback endpoint
app.put("/save-interview-feedback", async (req, res) => {
  try {
    const { interviewId, feedback } = req.body;

    const query = `
      UPDATE interviews
      SET interview_feedback = $1
      WHERE interview_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [feedback, interviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.status(200).json({
      message: "Feedback saved successfully",
      interview: result.rows[0]
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({
      error: "Failed to save feedback",
      details: error.message
    });
  }
});

// Update the report-to-hr endpoint
app.post("/report-to-hr", async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId, candidateIds, level } = req.body; // Add level parameter

    if (!postId || !candidateIds || !Array.isArray(candidateIds) || !level) {
      return res.status(400).json({ 
        error: 'Invalid request data. Required: postId, array of candidateIds, and level' 
      });
    }

    await client.query('BEGIN');

    // Update interviews only for candidates of specific level
    const updateQuery = `
      UPDATE interviews i
      SET report_to_hr = 'yes',
          progress = 'Completed'
      FROM candidate c
      WHERE i.candidate_id = c.candidate_id
      AND i.post_id = $1
      AND i.candidate_id = ANY($2::int[])
      AND c.candidate_level = $3
      RETURNING i.interview_id, i.candidate_id
    `;

    const result = await client.query(updateQuery, [postId, candidateIds, level]);

    // If no existing interviews, create new ones
    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO interviews (
          candidate_id, 
          post_id, 
          interview_stage,
          selected,
          report_to_hr,
          progress
        )
        SELECT 
          c.candidate_id,
          $1 as post_id,
          2 as interview_stage,
          'no' as selected,
          'yes' as report_to_hr,
          'Completed' as progress
        FROM candidate c
        WHERE c.candidate_id = ANY($2::int[])
        AND c.candidate_level = $3
        AND NOT EXISTS (
          SELECT 1 FROM interviews i
          WHERE i.post_id = $1
          AND i.candidate_id = c.candidate_id
        )
        RETURNING interview_id, candidate_id
      `;

      await client.query(insertQuery, [postId, candidateIds, level]);
    }

    // Update candidate progress
    const updateCandidateQuery = `
      UPDATE candidate
      SET progress = 'Interviewed'::interview_progress
      WHERE candidate_id = ANY($1::int[])
      AND candidate_level = $2
    `;

    await client.query(updateCandidateQuery, [candidateIds, level]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully reported ${level} level candidates to HR`,
      reportedCount: candidateIds.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reporting to HR:', error);
    res.status(500).json({
      error: 'Failed to report to HR',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Add endpoint to check report status
app.get('/check-report-status/:postId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.params;
    const { level } = req.query; // Add level parameter

    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM interviews i
        JOIN candidate c ON i.candidate_id = c.candidate_id
        WHERE i.post_id = $1 
        AND c.candidate_level = $2
        AND i.report_to_hr = 'yes'
      ) as has_reported
    `;

    const result = await client.query(query, [postId, level]);
    res.json({ hasReported: result.rows[0].has_reported });
  } catch (error) {
    console.error('Error checking report status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/posts-with-reported-candidates', async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT DISTINCT 
        p.*,
        COUNT(DISTINCT c.candidate_id) as reported_candidates_count,
        jsonb_agg(
          jsonb_build_object(
            'candidate_id', c.candidate_id,
            'name', c.name,
            'email', c.email,
            'level', c.candidate_level,
            'mcq_response', i.mcq_response,
            'interview_response', i.interview_response,
            'interview_performance', i.interview_performance
          )
        ) FILTER (WHERE c.candidate_id IS NOT NULL) as reported_candidates
      FROM post p
      JOIN candidate c ON c.job_id = p.post_id
      JOIN interviews i ON i.candidate_id = c.candidate_id AND i.post_id = p.post_id
      WHERE i.report_to_hr = 'yes'
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `;

    const result = await client.query(query);
    
    // Format the response to include only posts with reported candidates
    const postsWithReports = result.rows
      .filter(post => post.reported_candidates && post.reported_candidates.length > 0)
      .map(post => ({
        ...post,
        reported_candidates: post.reported_candidates.filter(rc => rc.candidate_id !== null)
      }));

    res.json(postsWithReports);
  } catch (error) {
    console.error('Error fetching posts with reported candidates:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add endpoint to get reportable candidates
app.get('/get-reportable-candidates/:postId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.params;
    const query = `
      SELECT DISTINCT
        i.interview_id,
        i.candidate_id,
        c.name as candidate_name,
        c.email,
        c.candidate_level,
        i.selected,
        i.createdat,
        i.mcq_response,
        i.interview_response,
        i.interview_performance,
        i.progress,
        p.exam_type
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      JOIN post p ON i.post_id = p.post_id
      WHERE i.post_id = $1
      AND i.progress = 'Completed'
      ORDER BY c.candidate_level`;

    const result = await client.query(query, [postId]);
    const mcqCandidates = result.rows.filter(r => r.exam_type === 'MCQ');
    const interviewCandidates = result.rows.filter(r => r.exam_type === 'Interview');

    res.json({
      mcq: mcqCandidates,
      interview: interviewCandidates
    });
  } catch (error) {
    console.error('Error fetching reportable candidates:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add endpoint to get verified candidates
app.get('/get-verified-candidates/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.interview_id,
        i.candidate_id,
        c.name as candidate_name,
        i.interview_stage,
        i.selected,
        i.createdat,
        CASE 
          WHEN i.interview_stage = 1 THEN i.mcq_response
          WHEN i.interview_stage = 2 THEN jsonb_build_object(
            'interview_response', i.interview_response,
            'interview_performance', i.interview_performance
          )
        END as response_data
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 
      AND i.report_to_hr = 'yes'
      ORDER BY i.createdat DESC
    `;
    
    const result = await pool.query(query, [postId]);
    
    res.json({
      candidates: result.rows.map(row => ({
        interview_id: row.interview_id,
        candidate_id: row.candidate_id,
        candidate_name: row.candidate_name,
        interview_stage: row.interview_stage,
        selected: row.selected,
        createdat: row.createdat,
        response_data: row.response_data
      }))
    });
  } catch (error) {
    console.error('Error fetching verified candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint to get the correct post ID
app.get('/get-interview-post-id/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Modified query to check progress and exam_type
    const query = `
      SELECT i.interview_id, i.post_id, p.exam_type, i.progress
      FROM interviews i
      JOIN post p ON i.post_id = p.post_id
      WHERE i.candidate_id = $1
      AND p.exam_type = 'Interview'::exam_type_new
      AND (i.progress IS NULL OR i.progress != 'Completed')
      ORDER BY i.createdat DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [candidateId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active interview found for this candidate' 
      });
    }

    console.log('Found active interview:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching interview post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to get reportable candidate
app.get('/get-reportable-candidate/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.interview_id,
        i.candidate_id,
        c.name as candidate_name,
        i.interview_stage,
        i.selected,
        i.createdat,
        CASE 
          WHEN i.interview_stage = 1 THEN i.mcq_response
          WHEN i.interview_stage = 2 THEN jsonb_build_object(
            'interview_response', i.interview_response,
            'interview_performance', i.interview_performance
          )
        END as response_data
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 AND i.report_to_hr = 'yes'
      ORDER BY i.createdat DESC
    `;
    
    const result = await pool.query(query, [postId]);
    
    const processedRows = result.rows.map(row => ({
      ...row,
      selected: row.candidate_selected === 'yes' ? 'yes' : row.selected
    }));

    const mcqcandidate = processedRows.filter(row => row.interview_stage === 1);
    const interviewcandidate = processedRows.filter(row => row.interview_stage === 2);

    res.json({
      mcq: mcqcandidate,
      interview: interviewcandidate
    });
  } catch (error) {
    console.error('Error fetching reportable candidate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to update selected candidate
app.post('/update-selected-candidate', async (req, res) => {
  const client = await pool.connect();
  try {
    const { candidateIds, postId, action = 'select' } = req.body;
    const selectedValue = action === 'deselect' ? 'no' : 'yes';
    
    await client.query('BEGIN');

    // Update interviews table
    await client.query(`
      UPDATE interviews 
      SET selected = $1
      WHERE interview_id = ANY($2::int[])
      AND post_id = $3
      AND report_to_hr = 'yes'
    `, [selectedValue, candidateIds, postId]);

    // Get candidate IDs from the interviews that were updated
    const result = await client.query(`
      SELECT DISTINCT candidate_id 
      FROM interviews 
      WHERE interview_id = ANY($1::int[])
    `, [candidateIds]);

    // Update candidate table
    await client.query(`
      UPDATE candidate 
      SET selected = $1::selected_status
      WHERE candidate_id = ANY($2::int[])
      AND post_id = $3
    `, [selectedValue, result.rows.map(r => r.candidate_id), postId]);

    await client.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating selected candidate:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update the end-recruitment endpoint with correct enum casting
app.post('/end-recruitment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId, selectedCandidates } = req.body;
    
    await client.query('BEGIN');

    // 1. Reset questions for this post
    const resetQuestionsQuery = `
      UPDATE question 
      SET notify = FALSE, 
          question_start = 'No'
      WHERE job_id = $1
    `;
    await client.query(resetQuestionsQuery, [postId]);

    // 2. Get candidate_ids from selected interviews
    const getCandidateIdsQuery = `
      SELECT DISTINCT candidate_id 
      FROM interviews 
      WHERE interview_id = ANY($1::int[])
    `;
    const selectedCandidateResult = await client.query(getCandidateIdsQuery, [selectedCandidates]);
    const selectedCandidateIds = selectedCandidateResult.rows.map(row => row.candidate_id);

    console.log('Selected candidate IDs:', selectedCandidateIds);

    // 3. Update candidate table with selection status
    const updateCandidateQuery = `
      UPDATE candidate 
      SET selected = CASE 
            WHEN candidate_id = ANY($1::int[]) THEN 'Yes'::select_status
            ELSE 'No'::select_status 
          END,
          progress = 'Interviewed'::interview_progress
      WHERE job_id = $2`;

    await client.query(updateCandidateQuery, [selectedCandidateIds, postId]);

    // 4. Update interviews table with selection and progress
    const updateInterviewsQuery = `
      UPDATE interviews 
      SET selected = CASE 
            WHEN candidate_id = ANY($1::int[]) THEN 'yes'::selection_status
            ELSE 'no'::selection_status
          END,
          progress = 'Completed'::progress,
          report_to_hr = 'no'
      WHERE post_id = $2`;

    await client.query(updateInterviewsQuery, [selectedCandidateIds, postId]);

    // 5. Update post status to completed
    const updatePostQuery = `
      UPDATE post 
      SET status = 'completed',
          exam_status = 'completed'
      WHERE post_id = $1`;

    await client.query(updatePostQuery, [postId]);

    // 6. Get all candidates for email notifications
    const getAllCandidatesQuery = `
      SELECT 
        c.candidate_id, 
        c.name, 
        c.email,
        p.title as job_title,
        i.interview_id
      FROM candidate c
      JOIN post p ON c.job_id = p.post_id
      LEFT JOIN interviews i ON c.candidate_id = i.candidate_id AND i.post_id = p.post_id
      WHERE c.job_id = $1`;
    
    const allCandidates = await client.query(getAllCandidatesQuery, [postId]);
    
    // 7. Send email notifications to all candidates
    for (const candidate of allCandidates.rows) {
      const isSelected = selectedCandidateIds.includes(candidate.candidate_id);
      try {
        const emailResponse = await fetch('http://localhost:5000/api/send-recruitment-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: candidate.email,
            name: candidate.name,
            jobTitle: candidate.job_title,
            isSelected: isSelected
          })
        });

        if (!emailResponse.ok) {
          console.error(`Failed to send email to ${candidate.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${candidate.email}:`, emailError);
        // Continue with other candidates even if one email fails
      }
    }

    await client.query('COMMIT');
    
    res.json({ 
      success: true,
      message: 'Recruitment process completed successfully',
      selectedCandidates: selectedCandidateIds,
      totalCandidates: allCandidates.rows.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ending recruitment:', error);
    res.status(500).json({ 
      error: 'Failed to end recruitment process',
      details: error.message
    });
  } finally {
    client.release();
  }
});

app.post('/check-test-status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { candidateId, postId } = req.body;

    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM interviews 
        WHERE candidate_id = $1 
        AND post_id = $2 
        AND progress = 'Completed'
      ) as is_completed
    `;

    const result = await client.query(query, [candidateId, postId]);
    
    res.json({ 
      isCompleted: result.rows[0].is_completed 
    });
  } catch (error) {
    console.error('Error checking test status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/check-interview-status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { candidateId, postId } = req.body;

    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM interviews 
        WHERE candidate_id = $1 
        AND post_id = $2 
        AND progress = 'Completed'
      ) as is_completed
    `;

    const result = await client.query(query, [candidateId, postId]);
    
    res.json({ 
      isCompleted: result.rows[0].is_completed 
    });
  } catch (error) {
    console.error('Error checking interview status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update the check recruitment status endpoint
app.get('/check-recruitment-status/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM post p
        WHERE p.post_id = $1 
        AND (
          p.status = 'completed'
          OR EXISTS (
            SELECT 1 FROM interviews i
            WHERE i.post_id = $1
            AND i.selected = 'yes'
          )
        )
      ) as is_completed
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({
      isCompleted: result.rows[0]?.is_completed || false
    });
  } catch (error) {
    console.error('Error checking recruitment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview stage
app.get('/get-interview-stage/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT MAX(interview_stage) as stage
      FROM interviews
      WHERE post_id = $1
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({ stage: result.rows[0]?.stage || 1 });
  } catch (error) {
    console.error('Error getting interview stage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle new recruitment
app.post('/new-recruitment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId, candidateIds, currentPostId, isNewPost } = req.body;
    
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO interviews 
      (candidate_id, post_id, interview_stage, selected, createdat, report_to_hr)
      SELECT 
        i.candidate_id,
        $1 as post_id,
        1 as interview_stage,
        'no' as selected,
        NOW() as createdat,
        'no' as report_to_hr
      FROM interviews i
      WHERE i.post_id = $2 
      AND i.candidate_id = ANY($3::int[])
      AND NOT EXISTS (
        SELECT 1 FROM interviews existing
        WHERE existing.post_id = $1
        AND existing.candidate_id = i.candidate_id
      )
    `;

    await client.query(insertQuery, [postId, currentPostId, candidateIds]);
    await client.query('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating new interviews:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/get-mcq-response/:postId/:candidateId', async (req, res) => {
  try {
    const { postId, candidateId } = req.params;
    console.log('Getting MCQ response for:', { postId, candidateId });

    // Get the mcq_responses directory for this post
    const mcqDir = path.join(process.cwd(), 'mcq_responses', `post_${postId}`);
    console.log('Looking in directory:', mcqDir);

    // Check if directory exists
    try {
      await fs.access(mcqDir);
    } catch (error) {
      console.log('Directory not found, returning empty response');
      return res.status(404).json({ message: 'MCQ response not found' });
    }

    const files = await fs.readdir(mcqDir);
    console.log('Found files:', files);

    // Find file that starts with candidateId_
    const matchingFile = files.find(file => file.startsWith(`${candidateId}_`));
    
    if (!matchingFile) {
      console.log('No matching file found for candidateId:', candidateId);
      return res.status(404).json({ message: 'MCQ response not found' });
    }

    console.log('Found matching file:', matchingFile);
    const filePath = path.join(mcqDir, matchingFile);
    
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Format response to match the get-mcq-results structure
    const response = {
      ...data,
      candidateId,
      date: data.date || new Date().toISOString(),
      _id: `${candidateId}_${data.date || new Date().toISOString()}`
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error reading MCQ response:', error);
    res.status(500).json({ 
      error: 'Failed to get MCQ response',
      details: error.message 
    });
  }
});

// Add new endpoint to get post type and responses
app.get('/get-responses/:postId/:candidateId', async (req, res) => {
  try {
    const { postId, candidateId } = req.params;

    // Get post type
    const postQuery = `
      SELECT exam_type 
      FROM post
      WHERE post_id = $1
    `;
    const postResult = await pool.query(postQuery, [postId]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const examType = postResult.rows[0].exam_type;
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

    if (examType === 'MCQ') {
      const mcqPath = path.join(
        process.cwd(),
        'mcq_responses',
        `post_${postId}`,
        `${candidateId}_${dateStr}.json`
      );
      const mcqData = await fs.readFile(mcqPath, 'utf8');
      res.json({ type: 'MCQ', data: JSON.parse(mcqData) });
    } else {
      const conversationPath = path.join(
        process.cwd(),
        'conversations',
        `post_${postId}`,
        `${candidateId}_${dateStr}.json`
      );
      const rankingPath = path.join(
        process.cwd(),
        'rankings',
        `post_${postId}`,
        `${candidateId}_${dateStr}.json`
      );

      const conversation = await fs.readFile(conversationPath, 'utf8');
      const ranking = await fs.readFile(rankingPath, 'utf8');
      
      res.json({
        type: 'Interview',
        conversation: JSON.parse(conversation),
        ranking: JSON.parse(ranking)
      });
    }
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get post details
app.get('/posts/:postId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.params;
    const query = `
      SELECT 
        post_id,
        title,
        description,
        exam_type,
        status,
        exam_status,
        post_stage
      FROM post 
      WHERE post_id = $1
    `;
    const result = await client.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post details' });
  } finally {
    client.release();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Update the get-conversation endpoint
app.get("/get-conversation/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.candidate_id,
        i.interview_response,
        i.interview_performance,
        c.name as candidate_name
      FROM interviews i
      JOIN candidate c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 
      AND i.interview_stage = 2
      AND i.interview_response IS NOT NULL`;

    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No conversations found' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error reading conversations:', err);
    res.status(500).json({ error: 'Failed to read conversations' });
  }
});

// Update the get-conversation-hr endpoint
app.get("/get-conversation-hr/:postId/:candidateId", async (req, res) => {
  try {
    const { postId, candidateId } = req.params;
    
    const query = `
      SELECT interview_response
      FROM interviews
      WHERE post_id = $1 
      AND candidate_id = $2
      AND interview_stage = 2
      AND interview_response IS NOT NULL`;

    const result = await pool.query(query, [postId, candidateId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send the interview_response JSON directly
    res.json(result.rows[0].interview_response);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Add this new endpoint to update post status
app.post("/update-post-status", async (req, res) => {
  try {
    const { postId, status } = req.body;
    
    const query = `
      UPDATE post
      SET status = $1 
      WHERE post_id = $2 
      RETURNING *
    `;

    const result = await pool.query(query, [status, postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: 'Post status updated successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating post status:', error);
    res.status(500).json({
      error: 'Failed to update post status',
      details: error.message
    });
  }
});

// Fix the table name in the exam type endpoint
app.get('/api/exam-type/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const query = 'SELECT exam_type FROM post WHERE post_id = $1'; 
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length > 0) {
      res.json({ exam_type: result.rows[0].exam_type });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get candidate level
app.get('/api/candidate-level/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const query = `
      SELECT candidate_level as level
      FROM candidate 
      WHERE candidate_id = $1
    `;
    
    const result = await pool.query(query, [candidateId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ level: result.rows[0].level });
  } catch (error) {
    console.error('Error fetching candidate level:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get MCQ questions based on level
app.get('/api/mcq-questions/:postId/:level', async (req, res) => {
  try {
    const { postId, level } = req.params;
    const query = `
      SELECT questions
      FROM question
      WHERE job_id = $1 
      AND question_level = $2::question_level
      AND exam_type = 'MCQ'::exam_type
    `;
    
    const result = await pool.query(query, [postId, level]);
    
    if (result.rows.length === 0) {
      return res.json({ questions: [] }); // Return empty array if no questions found
    }

    // Parse the JSONB questions field from the database
    const questions = result.rows[0].questions;
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching MCQ questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview questions based on level
app.get('/api/interview-questions/:postId/:level', async (req, res) => {
  try {
    const { postId, level } = req.params;
    const query = `
      SELECT questions
      FROM question
      WHERE job_id = $1 
      AND question_level = $2::question_level
      AND exam_type = 'interview'::exam_type
    `;
    
    const result = await pool.query(query, [postId, level]);
    
    if (result.rows.length === 0) {
      return res.json({ questions: [] });
    }

    // Parse the JSONB questions field from the database
    const questions = result.rows[0].questions;
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching interview questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get candidate interview level
app.get('/api/interview-level/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const query = `
      SELECT candidate_level as level
      FROM candidate 
      WHERE candidate_id = $1
    `;
    
    const result = await pool.query(query, [candidateId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ level: result.rows[0].level });
  } catch (error) {
    console.error('Error fetching candidate level:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint to get test time
app.get('/api/test-time/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const query = `
      SELECT time
      FROM post
      WHERE post_id = $1
    `;
    
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      time: result.rows[0].time // This returns time in minutes
    });
    
  } catch (error) {
    console.error('Error fetching test time:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to fetch test configuration
app.get('/api/test-config/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const query = `
      SELECT time, followup, coverage
      FROM post
      WHERE post_id = $1
    `;
    
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      time: result.rows[0].time,
      followup: result.rows[0].followup,
      coverage: result.rows[0].coverage
    });
    
  } catch (error) {
    console.error('Error fetching test configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this to your backend API routes file
app.get('/api/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const query = 'SELECT title FROM post WHERE post_id = $1';
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this new endpoint to get panel level
app.get('/api/get-panel-level/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const username = req.query.username;
    
    const query = `
      SELECT panel_id
      FROM post 
      WHERE post_id = $1
    `;
    
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Post not found' 
      });
    }

    const panelMembers = result.rows[0].panel_id.split(',');
    let level = '';

    // Determine level based on position in panel_id
    const index = panelMembers.indexOf(username);
    switch(index) {
      case 0:
        level = 'Beginner';
        break;
      case 1:
        level = 'Intermediate';
        break;
      case 2:
        level = 'Advanced';
        break;
      default:
        return res.status(404).json({ 
          error: 'Panel member not found for this post' 
        });
    }

    res.json({ 
      level,
      panelPosition: index
    });

  } catch (error) {
    console.error('Error getting panel level:', error);
    res.status(500).json({ 
      error: 'Failed to get panel level',
      details: error.message 
    });
  }
});

// In your Express.js server file

// Update candidates status for a post
app.put('/update-candidates-status/:postId', async (req, res) => {
  const { postId } = req.params;
  const { status, excludedCandidates } = req.body;
  
  try {
    // Update candidates that are not in the excluded list
    await pool.query(
      `UPDATE candidate 
       SET selected = 'No'::select_status 
       WHERE job_id = $1 
       AND candidate_id != ALL($2::int[])`,
      [postId, excludedCandidates]
    );

    // Update excluded candidates to 'Pending'
    if (excludedCandidates && excludedCandidates.length > 0) {
      await pool.query(
        `UPDATE candidate 
         SET selected = 'Pending'::select_status 
         WHERE job_id = $1 
         AND candidate_id = ANY($2::int[])`,
        [postId, excludedCandidates]
      );
    }

    res.json({ message: 'Candidates status updated successfully' });
  } catch (err) {
    console.error('Error updating candidates status:', err);
    res.status(500).json({ error: 'Failed to update candidates status' });
  }
});

// Update the /move-candidates endpoint
app.post('/move-candidates', async (req, res) => {
  const { oldPostId, newPostId, candidateIds } = req.body;
  
  try {
    await pool.query(
      `UPDATE candidate 
       SET job_id = $1, 
           selected = 'Pending'::select_status 
       WHERE job_id = $2 
       AND candidate_id = ANY($3::int[])`,
      [newPostId, oldPostId, candidateIds]
    );
    res.json({ message: 'Candidates moved successfully' });
  } catch (err) {
    console.error('Error moving candidates:', err);
    res.status(500).json({ error: 'Failed to move candidates' });
  }
});

// Complete old post
app.put('/complete-post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const result = await pool.query(
      `UPDATE post 
       SET status = 'completed', 
           exam_status = 'completed'
       WHERE post_id = $1
       RETURNING *`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      message: 'Post completed successfully',
      post: result.rows[0]
    });
  } catch (err) {
    console.error('Error completing post:', err);
    res.status(500).json({ 
      error: 'Failed to complete post',
      details: err.message 
    });
  }
});

// In deepgram.js
app.post('/update-candidates-new-recruitment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { selectedCandidates, newPostId, oldPostId, title, stage } = req.body;
    
    await client.query('BEGIN');

    // 1. Update selected candidates with new post_id
    await client.query(`
      UPDATE candidate 
      SET job_id = $1,
          selected = 'Pending'::select_status,
          progress = 'Applied'::interview_progress
      WHERE job_id = $2 
      AND candidate_id = ANY($3::int[])`,
      [newPostId, oldPostId, selectedCandidates]
    );

    // 2. Set non-selected candidates' selected status to 'No'
    await client.query(`
      UPDATE candidate 
      SET selected = 'No'::select_status
      WHERE job_id = $2 
      AND candidate_id != ALL($3::int[])`,
      [newPostId, oldPostId, selectedCandidates]
    );

    // 3. Mark old post as completed
    await client.query(`
      UPDATE post 
      SET status = 'completed',
          exam_status = 'completed'
      WHERE post_id = $1`,
      [oldPostId]
    );

    await client.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating candidates:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});