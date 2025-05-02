from flask import Flask, request, jsonify
from flask_cors import CORS
import filetype
import pytesseract
import pdfplumber
import google.generativeai as genai
from docx import Document
from PIL import Image
import json
import psycopg2 
from werkzeug.utils import secure_filename  # Add this import too since it's used in submit_candidate
import os
import logging

# Configure pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173"]}})

# Load configuration
def load_config():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'config.json')
        
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load configuration: {str(e)}")
        raise

# Load config and configure Google AI
try:
    config = load_config()
    genai.configure(api_key=config['google_ai']['api_key'])
    logger.info("Successfully configured Google AI")
except Exception as e:
    logger.error(f"Failed to configure Google AI: {str(e)}")
    raise

# Database connection function
def get_db_connection():
    try:
        # Get the current directory and construct path to config.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'config.json')
        
        # Load database configuration from config.json
        with open(config_path, 'r') as f:
            config = json.load(f)
            db_config = config['database']

        # Attempt connection with config values
        conn = psycopg2.connect(
            user=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database']
        )
        
        return conn

    except FileNotFoundError as e:
        logger.error(f"Config file not found: {str(e)}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing config file: {str(e)}")
        raise
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise

# Extract text
def extract_text(file_path):
    kind = filetype.guess(file_path)
    if not kind:
        return None, "Unknown file type"

    mime_type = kind.mime
    try:
        if mime_type == "application/pdf":
            with pdfplumber.open(file_path) as pdf:
                return "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()]), None
        elif "word" in mime_type:
            return "\n".join([p.text for p in Document(file_path).paragraphs]), None
        elif "image" in mime_type:
            return pytesseract.image_to_string(Image.open(file_path)), None
        return None, "Unsupported file type"
    except Exception as e:
        return None, f"Extraction error: {e}"

# Classify candidate level
def classify_candidate_level(resume_text):
    prompt = f"""
    You are an expert recruitment AI. Analyze the resume text and classify the candidate into one of the three categories: 
     **Beginner**: Less than 2 years of experience, entry-level roles, internships, or student projects. 
     **Intermediate**: 2 to 5 years of experience, mid-level roles, or relevant skills with some advanced projects. 
     **Advanced**: More than 5 years of experience, senior-level roles, leadership positions, or highly specialized expertise.

    Consider keywords such as **years of experience**, **job titles**, **skills**, **projects**, and **certifications**. 

    🔹 **Resume Content:**
    {resume_text}

    Provide ONLY one of these three words in response: **Beginner, Intermediate, or Advanced**.
    """
    try:
        model = genai.GenerativeModel('models/gemini-1.5-pro')
        response = model.generate_content(prompt)
        classification = response.text.strip()

        # Ensure response is valid
        if classification not in ["Beginner", "Intermediate", "Advanced"]:
            classification = "Unknown"

        return classification

    except Exception as e:
        logger.error("Google AI classification failed: %s", e)
        return None

# Update the submit_candidate route
@app.route('/submit', methods=['POST'])
def submit_candidate():
    conn = None
    cursor = None
    temp_path = None

    try:
        logger.debug("Received submission request")
        
        # Get and validate job_id first
        job_id = request.form.get('job_id')
        if not job_id:
            logger.error("No job ID provided")
            return jsonify({"error": "Job ID is required"}), 400

        try:
            job_id = int(job_id)
        except ValueError:
            logger.error(f"Invalid job ID format: {job_id}")
            return jsonify({"error": "Invalid job ID format"}), 400

        # Verify job exists
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT post_id FROM post WHERE post_id = %s", (job_id,))
        if not cursor.fetchone():
            logger.error(f"Job ID {job_id} not found")
            return jsonify({"error": "Invalid job ID - job not found"}), 404

        # Process rest of the submission
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        
        if not all([name, email, phone]):
            logger.error("Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400

        if 'resume' not in request.files:
            logger.error("No resume file provided")
            return jsonify({"error": "No resume file provided"}), 400

        resume_file = request.files['resume']

        allowed_extensions = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'}
        if not allowed_file(resume_file.filename, allowed_extensions):
            logger.error(f"Invalid file type: {resume_file.filename}")
            return jsonify({"error": "Invalid file type. Allowed types: PDF, DOC, DOCX, PNG, JPG"}), 400

        # Save and process file
        filename = secure_filename(resume_file.filename)
        temp_path = os.path.join('temp', filename)
        os.makedirs('temp', exist_ok=True)
        resume_file.save(temp_path)

        logger.debug(f"Saved file to: {temp_path}")

        # Extract text from resume
        resume_text, error = extract_text(temp_path)
        if error or not resume_text:
            logger.error("Failed to extract text from resume")
            raise ValueError("Failed to extract text from resume")

        logger.debug(f"Extracted text from resume: {resume_text[:100]}...")

        # Classify candidate level
        candidate_level = classify_candidate_level(resume_text)
        logger.debug(f"Resume classified as: {candidate_level}")

        # Create JSON structure for resume data
        resume_json = {
            "extracted_text": resume_text,
            "file_name": filename,
        }

        # Database connection and insertion
        query = """
            INSERT INTO candidate (
                name, 
                email, 
                phone, 
                resume, 
                job_id,  
                candidate_level,
                progress,
                selected
            )
            VALUES (
                %s, %s, %s, %s, %s, %s::candidate_level, 
                'Applied'::interview_progress, 
                'Pending'::select_status
            )
            RETURNING candidate_id
        """
        
        logger.debug(f"Executing query with values: {name}, {email}, {phone}, {job_id}, {candidate_level}")
        
        cursor.execute(
            query, 
            (
                name,
                email,
                phone,
                json.dumps(resume_json),
                job_id,
                candidate_level
            )
        )
        
        new_candidate_id = cursor.fetchone()[0]
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Application submitted successfully!",
            "candidate_id": new_candidate_id,
            "job_id": job_id
        }), 200

    except Exception as e:
        logger.error(f"Error processing submission: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        if cursor and not cursor.closed:
            cursor.close()
        if conn:
            conn.close()
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Error removing temp file: {str(e)}")

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

if __name__ == '__main__':
    app.run(debug=True, port=5001)
