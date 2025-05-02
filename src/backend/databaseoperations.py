from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import psycopg2
import os
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime
import random
import string
from datetime import datetime, timedelta
from datetime import date
import json

app = Flask(__name__)
# Configure CORS to allow requests from your frontend
CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:5173"],  # Specific origin instead of wildcard
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }})
# Load database config directly from JSON file
def get_db_connection():
    try:
        # Load config from JSON file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'config.json')
        with open(config_path, 'r') as f:
            config = json.load(f)
            db_config = config['database']
        
        # Connect to database without SSL for local connection
        conn = psycopg2.connect(
            user=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database']
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

# Global variable for email storage
received_email = None
active_otps = {}  # Store OTPs with expiration times

# Helper functions
def generate_otp(length=6):
    """Generate a random OTP of specified length."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp):
    """Send OTP via email."""
    try:
        email_sender = 'innovativehiring032@gmail.com'
        email_password = os.getenv('EMAIL_PASSWORD', 'gyyj zcta jsxs fmdt')
        
        msg = EmailMessage()
        msg.set_content(f"""
        Dear User,

        Your OTP for password reset is: {otp}

        This OTP will expire in 15 minutes.

        If you did not request this, please ignore this email.

        Best regards,
        Innovative Hiring Team
        """)
        
        msg["Subject"] = "Password Reset OTP"
        msg["From"] = email_sender
        msg["To"] = email

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(email_sender, email_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending OTP email: {e}")
        return False

#Function to get all active jobs
@app.route('/jobs', methods=['GET'])
def get_jobs():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cur = conn.cursor()
        # Modified query to exclude posts with stage > 1
        cur.execute("""
            SELECT post_id, title, description, minimum_experience, exam_type, 
                   application_deadline, status, exam_status
            FROM post
            WHERE status = 'active' 
            AND (application_deadline IS NULL OR application_deadline >= CURRENT_DATE)
            AND exam_status = 'pending'::exam_status
            AND (post_stage IS NULL OR post_stage <= 1)  
            ORDER BY created_at DESC
        """)

        jobs = [
            {
                "job_id": row[0],
                "job_title": row[1],
                "description": row[2],
                "minimum_experience": row[3],
                "exam_type": row[4],
                "application_deadline": row[5].strftime('%Y-%m-%d') if row[5] else None,
                "exam_status": row[7]
            }
            for row in cur.fetchall()
        ]

        return jsonify(jobs)
    except Exception as e:
        print(f"Error fetching jobs: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

#For loging in users
@app.route('/login', methods=['POST'])
def login():
    """Handle user login with username/email and password."""
    # Get login credentials from request
    data = request.json
    username_or_email = data.get("username")
    password = data.get("password")

    # Validate required fields
    if not username_or_email or not password:
        return jsonify({
            "message": "Username or email and password are required",
            "status": "error"
        }), 400

    # Establish database connection
    conn = get_db_connection()
    if not conn:
        return jsonify({
            "message": "Database connection failed",
            "status": "error"
        }), 500

    try:
        cursor = conn.cursor()
        
        # Query user data
        query = """
            SELECT id, username, email, user_password, user_role, user_status 
            FROM users 
            WHERE (username = %s OR email = %s)
        """
        cursor.execute(query, (username_or_email, username_or_email))
        user = cursor.fetchone()

        # Check account status and credentials
        if user and user[5] == 'Deactivated':
            return jsonify({
                "message": "Account is deactivated",
                "status": "error"
            }), 401

        if user and user[3] == password:
            # Get assigned candidates count for panel members
            cursor.execute("""
                SELECT COUNT(*) 
                FROM candidate 
                WHERE assigned_panel = %s
            """, (user[0],))
            assigned_count = cursor.fetchone()[0]

            # Return user data on successful login
            return jsonify({
                "message": "Login successful",
                "user": {
                    "user_id": user[0],
                    "username": user[1],
                    "email": user[2],
                    "role": user[4],
                    "assigned_candidates_count": assigned_count
                },
                "status": "success"
            }), 200
        
        return jsonify({
            "message": "Invalid credentials",
            "status": "error"
        }), 401

    except Exception as e:
        return jsonify({
            "message": str(e),
            "status": "error"
        }), 500
    finally:
        cursor.close()
        conn.close()

        
# Email registration routes
@app.route('/api/send-email', methods=['OPTIONS', 'POST'])
def receive_email():
    global received_email
    if request.method == "OPTIONS":
        return jsonify({"message": "Preflight OK"}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No JSON data received"}), 400

        email1 = data.get("email")
        if not email1:
            return jsonify({"success": False, "message": "Email is required"}), 400

        received_email = email1
        return jsonify({"success": True, "message": "Email send successfully"})
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

#To activate and deactivate the users
@app.route('/update-user-status', methods=['POST'])
def update_user_status():
    try:
        data = request.json
        user_id = data.get('user_id')
        new_status = data.get('status')

        if not user_id or not new_status:
            return jsonify({
                "success": False,
                "message": "User ID and status are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update user status
        cursor.execute("""
            UPDATE users 
            SET user_status = %s::status 
            WHERE id = %s
            RETURNING id, username, user_status
        """, (new_status, user_id))

        updated_user = cursor.fetchone()
        conn.commit()

        if updated_user:
            return jsonify({
                "success": True,
                "message": f"User status updated to {new_status}",
                "user": {
                    "id": updated_user[0],
                    "username": updated_user[1],
                    "status": updated_user[2]
                }
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

    except Exception as e:
        print(f"Error updating user status: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

#For registering users
@app.route('/register', methods=['POST'])
def register():
    conn = None
    cursor = None
    try:
        # Get registration data
        data = request.json
        username = data.get("username")
        password = data.get("password")
        email = data.get("email")

        # Validate inputs
        if not username or not password:
            return jsonify({
                "message": "Username and password are required",
                "status": "error"
            }), 400

        if not email:
            return jsonify({
                "message": "No email found. Please send email first.",
                "status": "error"
            }), 400

        # Database operations
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "message": "Database connection failed",
                "status": "error"
            }), 500

        cursor = conn.cursor()

        # Verify email exists
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if not cursor.fetchone():
            return jsonify({
                "message": "Email not found",
                "status": "error"
            }), 400

        # Update user record
        update_query = """
            UPDATE users 
            SET username = %s, 
                user_password = %s, 
                is_registered = TRUE, 
                user_status = 'Activated'
            WHERE email = %s
            RETURNING id, username, user_role
        """
        cursor.execute(update_query, (username, password, email))
        new_user = cursor.fetchone()
        conn.commit()

        return jsonify({
            "message": "User registered successfully",
            "user": {
                "user_id": new_user[0],
                "username": new_user[1],
                "role": new_user[2]
            },
            "status": "success"
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "message": f"Registration failed: {str(e)}",
            "status": "error"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


#For creating users
@app.route('/api/create-user', methods=['POST'])
def create_user():
    conn = None
    cursor = None
    try:
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No JSON data received"}), 400

        email = data.get("email")
        role = data.get("role")

        # Validate required fields
        if not email or not role:
            return jsonify({"success": False, "message": "Email and role are required!"}), 400

        # Validate role type
        if role not in ["Admin", "Hr", "Panel"]:
            return jsonify({"success": False, "message": "Invalid role!"}), 400

        # Database operations
        conn = get_db_connection()
        if conn is None:
            return jsonify({"success": False, "message": "Database connection failed"}), 500

        cursor = conn.cursor()
        
        # Check for existing email
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Email already registered!"}), 400

        # Insert new user
        cursor.execute(
            """
            INSERT INTO users 
            (email, user_role, user_status, is_registered, created_at)
            VALUES (%s, %s::roles, 'Deactivated'::status, FALSE, %s)
            RETURNING id
            """,
            (email, role, datetime.now())
        )
        user_id = cursor.fetchone()
        if not user_id:
            raise Exception("Failed to create user record")

        conn.commit()

        # Email configuration
        register_link = f"http://localhost:5173/register?email={email}"
        email_sender = 'innovativehiring032@gmail.com'
        email_password = os.getenv('EMAIL_PASSWORD', 'gyyj zcta jsxs fmdt')

        # Prepare email message
        msg = EmailMessage()
        msg.set_content(f"""
        Welcome to our platform!
        
        Click the following link to complete your registration: {register_link}
        
        This link will allow you to set up your username and password.
        """)
        msg["Subject"] = "Complete Your Registration"
        msg["From"] = email_sender
        msg["To"] = email

        # Send registration email
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(email_sender, email_password)
            server.send_message(msg)

        return jsonify({
            "success": True,
            "message": "User created successfully and registration email sent",
            "user_id": user_id[0]
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating user: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to create user: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
#To fetch the users
@app.route('/api/get-users', methods=['GET'])
def get_users():
    """
    Fetch all users from the database with their basic information.
    Returns a list of users with their ID, name, email, role, and status.
    """
    # Initialize database connection
    conn = get_db_connection()
    if not conn:
        return jsonify({
            "success": False, 
            "message": "Database connection failed"
        }), 500

    try:
        cursor = conn.cursor()
        
        # Query to fetch essential user information
        cursor.execute("""
            SELECT 
                id,
                username,
                email,
                user_role,
                user_status 
            FROM users
        """)
        
        # Transform database rows into JSON-friendly format
        users = [
            {
                "id": row[0],
                "name": row[1] or "Not Set",  # Use "Not Set" if username is None
                "email": row[2],
                "role": row[3],
                "status": row[4]
            }
            for row in cursor.fetchall()
        ]

        # Return the list of users
        return jsonify(users)

    except Exception as e:
        # Handle any database errors
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        # Ensure database resources are properly closed
        if cursor:
            cursor.close()
        if conn:
            conn.close()


#Checking if email exists and sends OTP
@app.route('/api/send-otp', methods=['OPTIONS', 'POST'])
def send_otp():
    """Handle OTP generation and sending for password reset."""
    # Handle preflight request
    if request.method == "OPTIONS":
        return jsonify({"message": "Preflight OK"}), 200
        
    # Get and validate email from request
    data = request.json
    email = data.get('email', '').lower()  # Convert to lowercase
    
    if not email:
        return jsonify({
            'success': False, 
            'message': 'Email is required'
        }), 400
    
    try:
        # Establish database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False, 
                'message': 'Database connection failed'
            }), 500

        cursor = conn.cursor()
        
        # Check if email exists (case-insensitive)
        cursor.execute(
            "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", 
            (email,)
        )
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False, 
                'message': 'Email not found'
            }), 404
        
        # Generate OTP and set expiration
        otp = generate_otp()
        expiration_time = datetime.now() + timedelta(minutes=15)
        active_otps[email] = {
            'otp': otp,
            'expires_at': expiration_time
        }
        
        # Send OTP via email
        if send_otp_email(email, otp):
            return jsonify({
                'success': True, 
                'message': 'OTP sent successfully'
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'Failed to send OTP'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': str(e)
        }), 500
    finally:
        # Clean up database resources
        if cursor:
            cursor.close()
        if conn:
            conn.close()


#For verifying the OTP received by the user
@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP submitted by user during password reset."""
    # Get request data
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    # Validate required fields
    if not email or not otp:
        return jsonify({
            'success': False, 
            'message': 'Email and OTP are required'
        }), 400
    
    # Check if OTP exists for email
    if email not in active_otps:
        return jsonify({
            'success': False, 
            'message': 'No active OTP found for this email'
        }), 404
    
    # Get stored OTP data
    otp_data = active_otps[email]
    
    # Check OTP expiration
    if datetime.now() > otp_data['expires_at']:
        del active_otps[email]  # Clean up expired OTP
        return jsonify({
            'success': False, 
            'message': 'OTP has expired'
        }), 400
    
    # Verify OTP matches
    if otp != otp_data['otp']:
        return jsonify({
            'success': False, 
            'message': 'Invalid OTP'
        }), 400
    
    # Return success response
    return jsonify({
        'success': True, 
        'message': 'OTP verified successfully'
    })

#For resetting user's credentials
@app.route('/api/reset-credentials', methods=['POST'])
def reset_credentials():
    """Handle password reset."""
    # Get request data
    data = request.json
    email = data.get('email', '').lower()
    new_password = data.get('newPassword')
    
    # Validate required fields
    if not email or not new_password:
        return jsonify({
            'success': False, 
            'message': 'Email and new password are required'
        }), 400
    
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False, 
                'message': 'Database connection failed'
            }), 500

        cursor = conn.cursor()
        
        # Update password using case-insensitive email comparison
        cursor.execute("""
            UPDATE users 
            SET user_password = %s
            WHERE LOWER(email) = LOWER(%s)
            RETURNING id
        """, (new_password, email))
        
        if cursor.fetchone():
            conn.commit()
            return jsonify({
                'success': True, 
                'message': 'Password updated successfully'
            })
        
        return jsonify({
            'success': False, 
            'message': 'User not found'
        }), 404
            
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            'success': False, 
            'message': str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

#To fetch the tasks assgined to the panel by HR
@app.route('/api/panel/tasks/<username>', methods=['GET'])
def get_panel_tasks(username):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'error',
                'message': 'Database connection failed'
            }), 500

        cursor = conn.cursor()

        # Updated query to include all necessary fields including application_deadline
        query = """
            SELECT 
                p.post_id as id,
                p.title,
                p.description,
                p.category,
                p.panel_id,
                p.exam_type as type,
                p.followup,
                p.coverage,
                p.time,
                p.test_start_date,
                p.application_deadline,
                p.status,
                p.post_stage,
                p.minimum_experience,
                p.exam_status
            FROM post p
            WHERE 
                p.panel_id LIKE %s
                AND p.status = 'active'
            ORDER BY p.test_start_date ASC
        """
        
        cursor.execute(query, [f'%{username}%'])
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            # Convert dates to string format to ensure JSON serialization
            test_start_date = row[9].strftime('%Y-%m-%d') if row[9] else None
            application_deadline = row[10].strftime('%Y-%m-%d') if row[10] else None
            
            task = {
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'category': row[3],
                'panel_id': row[4],
                'type': row[5],
                'followup': row[6],
                'coverage': row[7],
                'time': row[8],
                'test_start_date': test_start_date,
                'application_deadline': application_deadline,
                'status': row[11],
                'post_stage': row[12],
                'minimum_experience': row[13],
                'exam_status': row[14]
            }
            tasks.append(task)

        cursor.close()
        conn.close()

        return jsonify({
            'status': 'success',
            'tasks': tasks
        })

    except Exception as e:
        print(f"Error in get_panel_tasks: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/panel/notify-hr', methods=['POST'])
def notify_hr():
    try:
        data = request.json
        question_id = data.get('questionId')
        
        if not question_id:
            return jsonify({
                "status": "error",
                "message": "Question ID is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update notify status to true
        cursor.execute("""
            UPDATE question 
            SET notify = true 
            WHERE question_id = %s 
            RETURNING question_id, question_title, notify
        """, (question_id,))
        
        updated = cursor.fetchone()
        conn.commit()

        if updated:
            return jsonify({
                "status": "success",
                "message": "HR has been notified",
                "question": {
                    "id": updated[0],
                    "title": updated[1],
                    "notify": updated[2]
                }
            }), 200
        
        return jsonify({
            "status": "error",
            "message": "Question not found"
        }), 404

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

# Add this route to handle both OPTIONS and DELETE requests
@app.route('/api/delete-user/<int:user_id>', methods=['OPTIONS', 'DELETE'])
def delete_user(user_id):
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if user exists and is not an Admin
        cursor.execute("""
            SELECT user_role FROM users WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        if user[0] == 'Admin':
            return jsonify({
                "success": False,
                "message": "Cannot delete Admin users"
            }), 403

        # Delete user
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "User deleted successfully"
        })

    except Exception as e:
        print(f"Error deleting user: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/panel/delete-question/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First check if question exists and if it's notified
        cursor.execute("""
            SELECT notify 
            FROM question 
            WHERE question_id = %s
        """, (question_id,))
        
        question = cursor.fetchone()
        
        if not question:
            return jsonify({
                "status": "error",
                "message": "Question not found"
            }), 404
            
        if question[0]:  # if notify is True
            return jsonify({
                "status": "error",
                "message": "Cannot delete question that has been notified to HR"
            }), 403

        # Delete the question
        cursor.execute("""
            DELETE FROM question 
            WHERE question_id = %s 
            AND notify = false
        """, (question_id,))
        
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Question deleted successfully"
        }), 200

    except Exception as e:
        print(f"Error deleting question: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/questions/<question_type>', methods=['GET'])
def get_questions_by_type(question_type):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        username = request.args.get('username')
        if not username:
            return jsonify({
                "status": "error",
                "message": "Username is required"
            }), 400

        valid_types = ['MCQ', 'interview', 'ALL']
        normalized_type = question_type.upper() if question_type.upper() == 'MCQ' else question_type.lower()

        if (normalized_type == 'ALL'):
            query = """
                SELECT 
                    question_id, 
                    question_title, 
                    questions, 
                    exam_type, 
                    notify, 
                    created_by,
                    job_id
                FROM question
                WHERE created_by = %s
                ORDER BY question_id DESC
            """
            cursor.execute(query, (username,))
        else:
            query = """
                SELECT 
                    question_id, 
                    question_title, 
                    questions, 
                    exam_type, 
                    notify, 
                    created_by,
                    job_id
                FROM question
                WHERE exam_type = %s::exam_type 
                AND created_by = %s
                ORDER BY question_id DESC
            """
            cursor.execute(query, (normalized_type, username))

        questions = [{
            'question_id': row[0],
            'question_title': row[1],
            'questions': row[2],
            'exam_type': row[3],
            'notify': row[4],
            'created_by': row[5],
            'job_id': row[6]
        } for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "questions": questions
        }), 200

    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/questions', methods=['GET'])
def get_questions():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({
                "status": "error",
                "message": "Username is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                q.question_id, 
                q.question_title, 
                q.questions, 
                q.exam_type, 
                q.notify,
                q.created_by,
                q.job_id,
                q.question_level,
                p.title as post_title,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'candidate_id', c.candidate_id,
                            'name', c.name,
                            'email', c.email,
                            'progress', c.progress
                        )
                    ) FILTER (WHERE c.candidate_id IS NOT NULL 
                            AND c.candidate_level::text = q.question_level::text),
                    '[]'
                ) as candidates
            FROM question q
            LEFT JOIN post p ON q.job_id = p.post_id
            LEFT JOIN candidate c ON p.post_id = c.job_id
            WHERE q.created_by = %s
            GROUP BY 
                q.question_id, 
                q.question_title, 
                q.questions,
                q.exam_type,
                q.notify,
                q.created_by,
                q.job_id,
                q.question_level,
                p.title
            ORDER BY q.question_id DESC
        """, (username,))
        
        questions = [{
            'question_id': row[0],
            'question_title': row[1],
            'questions': row[2],
            'exam_type': row[3],
            'notify': row[4],
            'created_by': row[5],
            'job_id': row[6],
            'question_level': row[7],
            'post_title': row[8],
            'candidates': row[9]
        } for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "questions": questions
        }), 200

    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/hiring-questions', methods=['GET'])
def get_hiring_questions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                q.question_id,
                q.question_title,
                q.questions,
                q.exam_type,
                q.question_level,
                q.question_start,
                q.created_by,
                p.post_id as job_id,
                p.title as job_title,
                p.test_start_date,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'candidate_id', c.candidate_id,
                            'name', c.name,
                            'email', c.email,
                            'progress', c.progress
                        )
                    ) FILTER (WHERE c.candidate_id IS NOT NULL 
                            AND c.candidate_level::text = q.question_level::text),
                    '[]'
                ) as candidates
            FROM question q
            LEFT JOIN post p ON q.job_id = p.post_id
            LEFT JOIN candidate c ON p.post_id = c.job_id
            WHERE q.notify = true
            GROUP BY 
                q.question_id,
                q.question_title,
                q.questions,
                q.exam_type,
                q.question_level,
                q.question_start,
                q.created_by,
                p.post_id,
                p.title,
                p.test_start_date
            ORDER BY q.question_id DESC
        """)

        questions = [{
            'question_id': row[0],
            'question_title': row[1],
            'questions': row[2],
            'exam_type': row[3],
            'question_level': row[4],
            'question_start': row[5],
            'created_by': row[6],
            'job_id': row[7],
            'job_title': row[8],
            'test_start_date': row[9].strftime('%Y-%m-%d') if row[9] else None,
            'candidates': row[10]
        } for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "questions": questions
        })

    except Exception as e:
        print(f"Error fetching hiring questions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_panel_level(panel_id, username):
    """Determine panel level based on position in panel_id string"""
    if not panel_id or not username:
        return None
    
    panels = panel_id.split(',')
    index = panels.index(username) if username in panels else -1
    
    if index == 0:
        return 'Beginner'
    elif index == 1:
        return 'Intermediate'
    elif index == 2:
        return 'Advanced'
    return None

@app.route('/api/panel/save-questions', methods=['POST'])
def save_questions():
    try:
        data = request.get_json()
        question_title = data.get('question_title')
        questions = data.get('questions')
        exam_type = data.get('exam_type')
        created_by = data.get('created_by')
        job_id = data.get('job_id')

        if not all([question_title, questions, exam_type, created_by, job_id]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # First check if questions exist for this job AND user
        cursor.execute("""
            SELECT question_id 
            FROM question 
            WHERE job_id = %s AND created_by = %s
        """, (job_id, created_by))
        
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "You have already created questions for this job"
            }), 409

        # Get panel_id from post table
        cursor.execute("""
            SELECT panel_id FROM post WHERE post_id = %s
        """, (job_id,))
        result = cursor.fetchone()
        if not result:
            return jsonify({
                "status": "error",
                "message": "Job not found"
            }), 404

        panel_id = result[0]
        question_level = get_panel_level(panel_id, created_by)
        
        if not question_level:
            return jsonify({
                "status": "error",
                "message": "Could not determine question level"
            }), 400

        # Format questions based on exam type
        formatted_questions = []
        for q in questions:
            if exam_type.lower() == 'interview':
                question_data = {
                    "question": q["question"],
                    "expected_answer": q["expected_answer"]
                }
            else:  # MCQ
                correct_option = q["options"][int(q["correctAnswer"])]
                question_data = {
                    "question": q["question"],
                    "options": q["options"],
                    "correctAnswer": correct_option,
                    "explanation": q.get("explanation", "")
                }
            formatted_questions.append(question_data)

        # Insert question with level
        cursor.execute("""
            INSERT INTO question 
            (question_title, questions, exam_type, notify, created_by, job_id, question_level) 
            VALUES (%s, %s, %s::exam_type, false, %s, %s, %s::question_level)
            RETURNING question_id
        """, (
            question_title,
            json.dumps(formatted_questions),
            exam_type.lower() if exam_type.lower() == 'interview' else 'MCQ',
            created_by,
            job_id,
            question_level
        ))
        
        result = cursor.fetchone()
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Questions saved successfully",
            "question_id": result[0],
            "question_level": question_level
        }), 201

    except Exception as e:
        print(f"Error saving questions: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/save-selected-questions', methods=['POST'])
def save_selected_questions():
    try:
        data = request.json
        file_name = data.get('file_name')
        questions = data.get('questions')
        created_by = data.get('created_by')  # Add this line

        if not all([file_name, questions, created_by]):  # Update validation
            return jsonify({
                "status": "error",
                "message": "Missing required fields (file_name, questions, or created_by)"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update query to include created_by
        cursor.execute("""
            INSERT INTO question 
            (question_title, questions, exam_type, notify, created_by) 
            VALUES (%s, %s, 'MCQ', false, %s)
            RETURNING question_id, created_by
        """, (file_name, json.dumps(questions), created_by))
        
        result = cursor.fetchone()
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Questions saved successfully",
            "question_id": result[0],
            "created_by": result[1]
        }), 201

    except Exception as e:
        print(f"Error saving selected questions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/hr/start-test', methods=['POST', 'OPTIONS'])
def start_test():
    if request.method == 'OPTIONS':
        return {
            'Allow': 'POST, OPTIONS',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Credentials': 'true'
        }, 200

    try:
        data = request.get_json()
        question_id = data.get('questionId')
        candidates = data.get('candidates')

        conn = get_db_connection()
        cursor = conn.cursor()

        # First get the job details and update exam status
        cursor.execute("""
            UPDATE post p
            SET exam_status = 'started'::exam_status
            FROM question q
            WHERE q.job_id = p.post_id
            AND q.question_id = %s
            RETURNING 
                p.post_id,
                p.title,
                p.exam_type,
                p.time
        """, (question_id,))
        
        post_data = cursor.fetchone()
        if not post_data:
            raise Exception("Post not found")

        post_details = {
            'post_id': post_data[0],
            'title': post_data[1],
            'exam_type': post_data[2],
            'time': post_data[3]
        }

        # Update question start status
        cursor.execute("""
            UPDATE question 
            SET question_start = 'Yes'::question_start_enum
            WHERE question_id = %s
        """, (question_id,))

        email_sender = 'innovativehiring032@gmail.com'
        email_password = os.getenv('EMAIL_PASSWORD', 'gyyj zcta jsxs fmdt')
        emails_sent = 0

        for candidate in candidates:
            msg = EmailMessage()
            test_link = f"http://localhost:5173/test/{candidate['candidate_id']}/{post_details['post_id']}"
            
            msg.set_content(f"""
Dear {candidate['name']},

RE: Assessment Link - {post_details['title']}

Your assessment for the position of {post_details['title']} is now ready to begin.

Assessment Details:
------------------
Position: {post_details['title']}
Type: {post_details['exam_type']} Assessment
Duration: {post_details['time']} minutes

Access Link:
------------
{test_link}

Important Instructions:
----------------------
1. The assessment must be completed in a single session
2. Ensure stable internet connectivity throughout the test
3. Do not refresh or close the browser during the test
4. Have your government-issued ID ready for verification
5. Keep the following items ready:
   • A quiet, well-lit room
   • Working microphone
   • Updated browser (Chrome/Firefox recommended)

Technical Requirements:
----------------------
• Stable internet connection (minimum 1 Mbps)
• Desktop or laptop computer
• Updated web browser
• Working microphone

NOTE: The test link will be active for the specified duration only. Please start the test as soon as possible.

For any technical issues during the test, contact us immediately at innovativehiring032@gmail.com.

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
            """)

            msg["Subject"] = f"Assessment Link - {post_details['title']}"
            msg["From"] = email_sender
            msg["To"] = candidate['email']

            try:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                    server.login(email_sender, email_password)
                    server.send_message(msg)
                emails_sent += 1
            except Exception as e:
                print(f"Error sending email to {candidate['email']}: {str(e)}")
                continue

        conn.commit()
        
        if emails_sent > 0:
            return jsonify({
                "status": "success",
                "message": f"Test started and invitation sent to {emails_sent} candidates"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to send emails to any candidates"
            }), 500

    except Exception as e:
        print(f"Error in start_test: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Add this new endpoint to check for existing applications
@app.route('/api/check-application', methods=['POST'])
def check_application():
    try:
        data = request.get_json()
        email = data.get('email')
        job_id = data.get('job_id')

        if not email or not job_id:
            return jsonify({
                "status": "error",
                "message": "Email and job ID are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT candidate_id 
            FROM candidate 
            WHERE email = %s AND job_id = %s
        """, (email, job_id))

        exists = cursor.fetchone() is not None

        return jsonify({
            "status": "success",
            "exists": exists
        }), 200

    except Exception as e:
        print(f"Error checking application: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/delete-post/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, check if the post exists
        cursor.execute("SELECT post_id FROM post WHERE post_id = %s", (post_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "Post not found"
            }), 404

        # Start transaction
        cursor.execute("BEGIN")
        
        try:
            # First update questions to set job_id to NULL
            cursor.execute("""
                UPDATE question 
                SET job_id = NULL 
                WHERE job_id = %s
            """, (post_id,))

            # Then delete the post
            cursor.execute("""
                DELETE FROM post 
                WHERE post_id = %s
            """, (post_id,))

            # Commit the transaction
            cursor.execute("COMMIT")
            
            return jsonify({
                "status": "success",
                "message": "Post and related questions updated successfully"
            }), 200

        except Exception as e:
            # If anything goes wrong, rollback the transaction
            cursor.execute("ROLLBACK")
            raise e

    except Exception as e:
        print(f"Error deleting post: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/save-post', methods=['POST', 'OPTIONS'])
def save_post():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "No data provided"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert the new post
        cursor.execute("""
            INSERT INTO post (
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
                panel_id,
                status
            ) VALUES (
                %s, %s, %s, %s, %s::exam_type, %s, %s, %s, %s, %s, %s, 'active'::post_status
            ) RETURNING post_id
        """, (
            data['title'],
            data['description'],
            data['minimum_experience'],
            data['category'],
            data['exam_type'],
            data['followup'],
            data['coverage'],
            data['time'],
            data['application_deadline'],
            data['test_start_date'],
            ','.join(data['panel_members'])
        ))

        new_post = cursor.fetchone()
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Post created successfully",
            "post_id": new_post[0]
        }), 201

    except Exception as e:
        print(f"Error saving post: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

#To fetch the job ids of the active jobs
@app.route('/api/active-jobs', methods=['GET'])
def get_active_jobs():
    try:
        exam_type = request.args.get('exam_type')
        question_level = request.args.get('question_level')
        username = request.args.get('username')
        
        if not exam_type or not question_level:
            return jsonify({
                "status": "error",
                "message": "Exam type and question level are required"
            }), 400

        normalized_exam_type = exam_type.title() if exam_type.lower() == 'interview' else exam_type.upper()

        conn = get_db_connection()
        cursor = conn.cursor()

        # Modified query to exclude jobs that already have questions assigned
        cursor.execute("""
            WITH panel_positions AS (
                SELECT 
                    p.post_id,
                    p.title,
                    p.description,
                    p.category,
                    p.exam_type,
                    p.panel_id,
                    p.time,
                    p.post_stage,
                    CASE 
                        WHEN array_position(string_to_array(p.panel_id, ','), unnest.username) = 3 THEN 'Advanced'
                        WHEN array_position(string_to_array(p.panel_id, ','), unnest.username) = 2 THEN 'Intermediate'
                        WHEN array_position(string_to_array(p.panel_id, ','), unnest.username) = 1 THEN 'Beginner'
                    END as panel_level,
                    unnest.username,
                    EXISTS (
                        SELECT 1 
                        FROM question q 
                        WHERE q.job_id = p.post_id 
                        AND q.created_by = unnest.username
                    ) as has_questions
                FROM post p,
                LATERAL unnest(string_to_array(p.panel_id, ',')) as unnest(username)
                WHERE p.status = 'active'
                AND p.exam_type = %s::exam_type_new
                AND (p.exam_status IS NULL OR p.exam_status = 'pending')
            )
            SELECT DISTINCT
                post_id,
                title,
                description,
                category,
                exam_type,
                panel_id,
                time,
                post_stage,
                panel_level,
                has_questions
            FROM panel_positions
            WHERE username = %s 
            AND panel_level = %s
            AND has_questions = false
            ORDER BY post_id DESC;
        """, (normalized_exam_type, username, question_level))

        jobs = [{
            'post_id': row[0],
            'title': row[1],
            'description': row[2],
            'category': row[3],
            'exam_type': row[4],
            'panel_id': row[5],
            'time': row[6],
            'post_stage': row[7],
            'panel_level': row[8],
            'hasAssignedQuestions': row[9]
        } for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "jobs": jobs
        })

    except Exception as e:
        print(f"Error fetching active jobs: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/check-email', methods=['GET'])
def check_email():
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({
                "status": "error",
                "message": "Email is required",
                "exists": False
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email exists in users table
        cursor.execute("SELECT EXISTS(SELECT 1 FROM users WHERE email = %s)", (email,))
        exists = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "exists": exists
        })

    except Exception as e:
        print(f"Error checking email: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "exists": False
        }), 500

@app.route('/api/assign-job', methods=['POST'])
def assign_job():
    try:
        data = request.json
        question_id = data.get('questionId')
        job_id = data.get('jobId')

        if not question_id or not job_id:
            return jsonify({
                "status": "error",
                "message": "Question ID and Job ID are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE question
            SET job_id = %s
            WHERE question_id = %s
            RETURNING question_id
        """, (job_id, question_id))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Job assigned successfully"
        })

    except Exception as e:
        print(f"Error assigning job: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/unassign-job', methods=['POST'])
def unassign_job():
    try:
        data = request.json
        question_id = data.get('questionId')

        if not question_id:
            return jsonify({
                "status": "error",
                "message": "Question ID is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update the question to remove job_id
        cursor.execute("""
            UPDATE question 
            SET job_id = NULL 
            WHERE question_id = %s AND notify = false
        """, (question_id,))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Job unassigned successfully"
        })

    except Exception as e:
        print(f"Error unassigning job: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/candidate-test-details/<int:candidate_id>/<int:post_id>', methods=['GET'])
def get_candidate_test_details(candidate_id, post_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                c.candidate_id,
                c.name,
                c.email,
                c.progress,
                p.post_id,
                p.title,
                p.exam_type,
                p.time,
                q.questions
            FROM candidate c
            JOIN post p ON c.job_id = p.post_id
            JOIN question q ON q.job_id = p.post_id
            WHERE c.candidate_id = %s 
            AND p.post_id = %s
            AND p.exam_status = 'started'
        """, (candidate_id, post_id))

        result = cursor.fetchone()
        
        if not result:
            return jsonify({
                "status": "error",
                "message": "Invalid test details or test not started"
            }), 404

        return jsonify({
            "status": "success",
            "data": {
                "candidate_id": result[0],
                "candidate_name": result[1],
                "candidate_email": result[2],
                "progress": result[3],
                "post_id": result[4],
                "job_title": result[5],
                "exam_type": result[6],
                "time_allowed": result[7],
                "questions": result[8]
            }
        })

    except Exception as e:
        print(f"Error fetching test details: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/panel/assigned-posts/<username>', methods=['GET'])
def get_assigned_posts(username):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update query to include exam_status condition
        cursor.execute("""
            SELECT p.post_id, p.title, p.description, p.minimum_experience, 
                   p.category, p.exam_type, p.time, p.test_start_date, 
                   p.post_stage, p.exam_status
            FROM post p
            WHERE p.panel_id LIKE %s
            AND p.status = 'active'
            AND p.exam_status = 'started'
            ORDER BY p.test_start_date DESC
        """, (f'%{username}%',))

        posts = []
        for row in cursor.fetchall():
            posts.append({
                'post_id': row[0],
                'title': row[1],
                'description': row[2],
                'minimum_experience': row[3],
                'category': row[4],
                'exam_type': row[5],
                'time': row[6],
                'test_start_date': row[7].isoformat() if row[7] else None,
                'post_stage': row[8],
                'exam_status': row[9]
            })

        return jsonify({
            "status": "success",
            "posts": posts
        })

    except Exception as e:
        print(f"Error fetching assigned posts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/send-recruitment-result', methods=['POST'])
def send_recruitment_result():
    try:
        data = request.json
        candidate_email = data.get('email')
        candidate_name = data.get('name')
        job_title = data.get('jobTitle')
        is_selected = data.get('isSelected')

        if not all([candidate_email, candidate_name, job_title, is_selected is not None]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400

        email_sender = 'innovativehiring032@gmail.com'
        email_password = os.getenv('EMAIL_PASSWORD', 'gyyj zcta jsxs fmdt')

        msg = EmailMessage()
        
        if (is_selected):
            subject = f"Successful Selection - {job_title} Position"
            content = f"""
Dear {candidate_name},

RE: Selection Results - {job_title}

I am delighted to inform you that you have been selected for the position of {job_title}. Congratulations!

Your performance throughout our comprehensive recruitment process was exceptional, and we believe your skills and experience will be a valuable addition to our organization.

Next Steps:
-----------
1. Formal Offer Letter: You will receive a detailed offer letter within the next 2-3 business days
2. Documentation: A list of required documents will be shared shortly
3. Onboarding Process: Details about the onboarding schedule will follow

Important Information:
---------------------
• Position: {job_title}
• Location: [Office Location]
• Starting Date: To be confirmed in the offer letter
• Reporting To: Will be specified in the offer letter

Please note that this email serves as a preliminary confirmation of your selection. The official offer letter will contain all terms and conditions of employment.

We look forward to welcoming you to our team!

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
"""
        else:
            subject = f"Application Status Update - {job_title} Position"
            content = f"""
Dear {candidate_name},

RE: Application Status - {job_title}

Thank you for your interest in the {job_title} position and for taking the time to participate in our recruitment process.

After careful consideration of all applications and a thorough evaluation process, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely align with our current requirements.

Please note that:
----------------
• Your application has been retained in our database
• We will contact you if suitable positions arise in the future
• You are welcome to apply for other positions within our organization

Your time and effort throughout the recruitment process are greatly appreciated. We wish you success in your career pursuits.

Feedback:
---------
While we cannot provide detailed individual feedback, we encourage you to:
• Continue developing your skills in {job_title}-related technologies
• Gain more practical experience in the field
• Keep your professional profile updated

Thank you again for your interest in joining our organization.

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
"""

        msg.set_content(content)
        msg["Subject"] = subject
        msg["From"] = email_sender
        msg["To"] = candidate_email

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(email_sender, email_password)
            server.send_message(msg)

        return jsonify({
            "status": "success",
            "message": f"Email sent to {candidate_email}"
        })

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/notify-test-date', methods=['POST'])
def notify_test_date():
    try:
        data = request.json
        job_id = data.get('jobId')

        if not job_id:
            return jsonify({
                "status": "error",
                "message": "Job ID is required"
            }), 400

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get job details and candidate emails
        cursor.execute("""
            SELECT 
                p.title,
                p.test_start_date,
                c.email,
                c.name
            FROM post p
            JOIN candidate c ON c.job_id = p.post_id
            WHERE p.post_id = %s
        """, (job_id,))

        results = cursor.fetchall()

        if not results:
            return jsonify({
                "status": "error",
                "message": "No candidates found for this job"
            }), 404

        # Send email to each candidate
        for row in results:
            job_title = row[0]
            test_date = row[1]
            candidate_email = row[2]
            candidate_name = row[3]

            msg = EmailMessage()
            msg.set_content(f"""
Dear {candidate_name},

RE: Test Date Notification - {job_title}

I hope this email finds you well. This is an important notification regarding your upcoming assessment for the position of {job_title}.

Test Details:
-------------
Date: {test_date.strftime('%B %d, %Y')}
Position: {job_title}

Important Information:
---------------------
• Please ensure you have a stable internet connection
• Keep your government-issued ID ready for verification
• Ensure your device (computer/laptop) is fully charged
• Have a quiet, well-lit environment for the test
• Be available for the entire duration of the test

Next Steps:
-----------
You will receive another email with the test link and detailed instructions closer to the test date. The link will be active only during the scheduled test time.

Important Note:
--------------
If you anticipate any issues with the scheduled date or have technical concerns, please contact us immediately at innovativehiring032@gmail.com.

We wish you the best for your assessment.

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
            """)

            msg["Subject"] = f"Test Date Reminder - {job_title}"
            msg["From"] = "innovativehiring032@gmail.com"
            msg["To"] = candidate_email

            # Send email
            try:
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context()) as server:
                    server.login("innovativehiring032@gmail.com", "gyyj zcta jsxs fmdt")
                    server.send_message(msg)
            except Exception as e:
                print(f"Failed to send email to {candidate_email}: {str(e)}")

        return jsonify({
            "status": "success",
            "message": f"Test date notifications sent to {len(results)} candidates"
        })

    except Exception as e:
        print(f"Error in notify_test_date: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/questions/<int:question_id>/start-status', methods=['PUT'])
def update_question_start_status(question_id):
    try:
        data = request.json
        start_status = data.get('startStatus')

        if not start_status:
            return jsonify({
                "status": "error",
                "message": "Start status is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE question 
            SET question_start = %s::question_start_enum
            WHERE question_id = %s
            RETURNING question_id
        """, (start_status, question_id))

        updated = cursor.fetchone()
        conn.commit()

        if updated:
            return jsonify({
                "status": "success",
                "message": "Question start status updated successfully"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Question not found"
            }), 404

    except Exception as e:
        print(f"Error updating question start status: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/update-candidates-new-recruitment', methods=['POST'])
def update_candidates_new_recruitment():
    try:
        data = request.json
        selected_candidates = data.get('selectedCandidates')
        new_post_id = data.get('newPostId')
        old_post_id = data.get('oldPostId')
        job_title = data.get('title')
        stage = data.get('stage')

        if not all([selected_candidates, new_post_id, old_post_id, job_title]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get all candidates from the old post
        cursor.execute("""
            SELECT candidate_id, name, email 
            FROM candidate 
            WHERE job_id = %s
        """, (old_post_id,))
        
        all_candidates = cursor.fetchall()

        email_sender = 'innovativehiring032@gmail.com'
        email_password = os.getenv('EMAIL_PASSWORD', 'gyyj zcta jsxs fmdt')

        # Process selected candidates
        for candidate_id in selected_candidates:
            # Update selected candidates with new post_id
            cursor.execute("""
                UPDATE candidate 
                SET job_id = %s, progress = 'Applied'
                WHERE candidate_id = %s
            """, (new_post_id, candidate_id))

            # Send success email to selected candidates
            candidate = next((c for c in all_candidates if c[0] == candidate_id), None)
            if candidate:
                msg = EmailMessage()
                msg.set_content(f"""
Dear {candidate[1]},

Congratulations! You have been selected to proceed to Stage {stage} of the recruitment process for the position of {job_title}.

Your performance in the previous stage was impressive, and we would like to evaluate you further.

Next Steps:
-----------
• You will receive details about the next assessment shortly
• Please monitor your email for further instructions
• Ensure your contact information is up to date

We wish you continued success in the recruitment process.

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
                """)
                msg["Subject"] = f"Selected for Next Stage - {job_title}"
                msg["From"] = email_sender
                msg["To"] = candidate[2]

                context = ssl.create_default_context()
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                    server.login(email_sender, email_password)
                    server.send_message(msg)

        # Send rejection emails to non-selected candidates
        non_selected = [c for c in all_candidates if c[0] not in selected_candidates]
        for candidate in non_selected:
            msg = EmailMessage()
            msg.set_content(f"""
Dear {candidate[1]},

RE: Application Status - {job_title}

Thank you for your participation in our recruitment process for the position of {job_title}.

After careful consideration and evaluation of all candidates, we regret to inform you that we will not be proceeding with your application at this time.

Your time and effort throughout the recruitment process are greatly appreciated. We wish you success in your future endeavors.

Best regards,
Innovative Hiring Team
innovativehiring032@gmail.com
            """)
            msg["Subject"] = f"Application Status Update - {job_title}"
            msg["From"] = email_sender
            msg["To"] = candidate[2]

            context = ssl.create_default_context()
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(email_sender, email_password)
                server.send_message(msg)

        conn.commit()
        return jsonify({
            "status": "success",
            "message": "Candidates updated successfully"
        })

    except Exception as e:
        print(f"Error updating candidates: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/check-questions-bulk', methods=['GET'])
def check_questions_bulk():
    conn = None
    cur = None
    try:
        post_ids_str = request.args.get('postIds', '')
        username = request.args.get('username', '')

        if not post_ids_str:
            return jsonify({
                'status': 'error',
                'message': 'No post IDs provided'
            }), 400

        post_ids = [int(id) for id in post_ids_str.split(',') if id]
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'error',
                'message': 'Database connection failed'
            }), 500

        cur = conn.cursor()
        
        # Modified query to check if questions exist for specific posts and user
        query = """
            SELECT p.post_id, 
                   EXISTS(
                       SELECT 1 
                       FROM question q 
                       WHERE q.job_id = p.post_id 
                       AND q.created_by = %s
                   ) as has_questions
            FROM post p
            WHERE p.post_id = ANY(%s::int[])
        """
        
        cur.execute(query, (username, post_ids))
        results = cur.fetchall()
        
        exists_map = {str(post_id): exists for post_id, exists in results}
        
        return jsonify({
            'status': 'success',
            'exists': exists_map
        })

    except Exception as e:
        print(f"Error checking questions: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/check-completion/<int:candidate_id>/<int:post_id>', methods=['GET'])
def check_exam_completion(candidate_id, post_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if response exists in interviews table
        cur.execute("""
            SELECT EXISTS(
                SELECT 1 
                FROM interviews 
                WHERE candidate_id = %s 
                AND post_id = %s 
                AND (mcq_response IS NOT NULL OR interview_response IS NOT NULL)
            )
        """, (candidate_id, post_id))
        
        exists = cur.fetchone()[0]
        
        return jsonify({
            'status': 'success',
            'completed': exists
        })

    except Exception as e:
        print(f"Error checking exam completion: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/hr/upcoming-tests', methods=['GET'])
def get_hr_upcoming_tests():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        current_date = datetime.now().date()

        cursor.execute("""
            SELECT p.post_id, p.title, p.description, p.exam_type, 
                   p.test_start_date, p.panel_id, p.exam_status,
                   p.post_stage,
                   CASE WHEN p.test_start_date = %s THEN true ELSE false END as is_today
            FROM post p
            WHERE (p.test_start_date >= %s OR p.test_start_date = %s)
            AND p.status = 'active'
            ORDER BY p.test_start_date ASC, p.exam_type
        """, (current_date, current_date, current_date))

        posts = [{
            'post_id': row[0],
            'title': row[1],
            'description': row[2],
            'exam_type': row[3],
            'test_start_date': row[4].strftime('%Y-%m-%d'),
            'panel_id': row[5],
            'exam_status': row[6],
            'post_stage': row[7],
            'is_today': row[8]
        } for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "posts": posts
        })

    except Exception as e:
        print(f"Error fetching upcoming tests: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Add this new route after your existing routes
@app.route('/api/check-questions/<int:post_id>', methods=['GET'])
def check_questions(post_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT EXISTS(
                SELECT 1 
                FROM question 
                WHERE job_id = %s
            )
        """, (post_id,))
        
        exists = cursor.fetchone()[0]
        
        return jsonify({
            'exists': exists,
            'status': 'success'
        })

    except Exception as e:
        print(f"Error checking questions: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/exam-type/<int:post_id>', methods=['GET'])
def get_exam_type(post_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT exam_type, status, exam_status 
            FROM post 
            WHERE post_id = %s
        """, (post_id,))
        
        result = cursor.fetchone()
        
        if result:
            exam_type, status, exam_status = result
            if status == 'active' and exam_status == 'started':
                return jsonify({
                    "status": "success",
                    "exam_type": exam_type
                })
            
        return jsonify({
            "status": "error",
            "message": "Exam not found or not started"
        }), 404
        
    except Exception as e:
        print(f"Error fetching exam type: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/update-recruitment-stage', methods=['POST'])
def update_recruitment_stage():
    try:
        data = request.json
        old_post_id = data.get('oldPostId')
        new_post_id = data.get('newPostId')
        selected_candidates = data.get('selectedCandidates')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Update job_id for selected candidates in candidate table
        cur.execute("""
            UPDATE candidate 
            SET job_id = %s 
            FROM interviews 
            WHERE candidate.candidate_id = interviews.candidate_id 
            AND interviews.interview_id = ANY(%s)
        """, (new_post_id, selected_candidates))
        
        # Update post_id in interviews table
        cur.execute("""
            UPDATE interviews 
            SET post_id = %s 
            WHERE interview_id = ANY(%s)
        """, (new_post_id, selected_candidates))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Recruitment stage updated successfully"
        })
        
    except Exception as e:
        print(f"Error updating recruitment stage: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)