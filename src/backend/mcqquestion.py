import os
import json
import logging
import traceback
import random
import re

from dotenv import load_dotenv
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from time import sleep
from functools import wraps

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

# Load config and get API key
config = load_config()
API_KEY = config['google_ai']['api_key']

# Initialize Google AI
try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    logger.info("✅ Successfully initialized Google AI model")
except Exception as e:
    logger.error(f"❌ Failed to initialize Google AI: {str(e)}")
    raise

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def parse_and_validate_questions(response_text, requested_count):
    try:
        # Clean the response text
        response_text = response_text.strip()
        
        # Extract JSON from markdown if present
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()

        # Parse JSON
        questions = json.loads(response_text)
        if not isinstance(questions, list):
            questions = [questions]  # Convert single question to list

        validated_questions = []
        for i, q in enumerate(questions):
            try:
                # Validate question format
                if not isinstance(q, dict):
                    continue
                
                # Check required fields
                required_fields = {'question', 'options', 'correctAnswer', 'explanation'}
                if not all(field in q for field in required_fields):
                    continue
                
                # Validate options
                if not isinstance(q['options'], list) or len(q['options']) != 4:
                    continue
                
                # Ensure correctAnswer is valid
                if not isinstance(q['correctAnswer'], int) or q['correctAnswer'] not in range(4):
                    continue
                
                # Randomize correct answer index
                correct_index = random.randint(0, 3)
                correct_option = q['options'][q['correctAnswer']]
                q['options'][q['correctAnswer']], q['options'][correct_index] = q['options'][correct_index], q['options'][q['correctAnswer']]
                q['correctAnswer'] = correct_index
                
                # Add ID if missing
                if 'id' not in q:
                    q['id'] = i + 1
                
                validated_questions.append(q)

                if len(validated_questions) >= requested_count:
                    break
            except Exception:
                continue

        # Only return the exact number of questions requested
        validated_questions = validated_questions[:requested_count]

        if len(validated_questions) < requested_count:
            logger.warning(f"⚠️ Only generated {len(validated_questions)} valid questions out of {requested_count} requested")
        
        if not validated_questions:
            raise ValueError("No valid questions found in response")
            
        return validated_questions

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON parsing error: {str(e)}")
        raise ValueError(f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error validating questions: {str(e)}")
        raise ValueError(f"Failed to process questions: {str(e)}")

# Function to get response content safely
def get_response_content(response):
    try:
        return response.text
    except ValueError as e:
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts') and candidate.content.parts:
                    return candidate.content.parts[0].text
        raise

def generate_mcq_questions(prompt, num_questions):
    try:
        # Ensure num_questions is within the allowed range (10-15)
        num_questions = max(10, min(15, num_questions))
        
        logger.info(f"📝 Generating exactly {num_questions} MCQ questions for prompt: {prompt}")

        # Clean the prompt
        clean_prompt = ' '.join([word for word in prompt.split() if word.lower() not in ['about', 'generate', 'create', 'questions', 'mcq']]).strip()

        prompt_template = f"""
        Generate exactly {num_questions} multiple choice questions about {clean_prompt}.
        
        Rules:
        1. Use simple language
        2. Each question must have exactly 4 options
        3. Only one option should be correct
        4. Include a brief explanation for the correct answer
        5. Return a valid JSON array with this exact format:
        
        [
          {{
            "question": "Write a clear question here?",
            "options": [
              "First option",
              "Second option",
              "Third option",
              "Fourth option"
            ],
            "correctAnswer": 0,
            "explanation": "Brief explanation of why the answer is correct"
          }}
        ]

        Important:
        - Use proper JSON escaping for quotes and special characters
        - Ensure the JSON is properly terminated
        - No markdown formatting or extra text
        - Return exactly {num_questions} questions
        """

        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 30000,
        }

        # Generate response with error handling
        try:
            response = model.generate_content(
                contents=[{"role": "user", "parts": [{"text": prompt_template}]}],
                generation_config=generation_config,
            )

            response_text = get_response_content(response)
            if not response_text:
                raise ValueError("Empty response from AI model")

            # Log the raw response for debugging
            logger.debug(f"Raw AI response:\n{response_text}")

            # Clean the response text
            response_text = response_text.strip()
            if response_text.startswith('```') and response_text.endswith('```'):
                response_text = response_text[3:-3].strip()
            if response_text.startswith('json'):
                response_text = response_text[4:].strip()

            # Validate JSON structure
            try:
                questions = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON structure: {str(e)}")
                logger.error(f"Response text causing error: {response_text[:500]}...")
                raise ValueError("Generated response is not valid JSON")

            # Validate and process questions
            questions = parse_and_validate_questions(response_text, num_questions)
            
            # Ensure we have exactly the requested number of questions
            logger.info(f"✅ Successfully generated {len(questions)} questions")

            # If less than requested, attempt to generate additional questions
            if len(questions) < num_questions:
                logger.warning(f"⚠️ Only generated {len(questions)} valid questions out of {num_questions} requested")
                missing_count = num_questions - len(questions)
                
                if missing_count > 0:
                    # Generate additional questions to meet the required count
                    logger.info(f"Generating {missing_count} additional questions")
                    additional_prompt = f"""
                    Generate exactly {missing_count} more multiple choice questions about {clean_prompt}.
                    Different from these questions: {[q['question'] for q in questions]}
                    
                    Use the same format as before.
                    """
                    try:
                        additional_response = model.generate_content(
                            contents=[{"role": "user", "parts": [{"text": additional_prompt}]}],
                            generation_config=generation_config,
                        )
                        additional_text = get_response_content(additional_response)
                        additional_questions = parse_and_validate_questions(additional_text, missing_count)
                        questions.extend(additional_questions)
                        logger.info(f"✅ Added {len(additional_questions)} more questions")
                    except Exception as add_err:
                        logger.error(f"❌ Failed to generate additional questions: {str(add_err)}")
            
            # Trim excess if there are more than needed
            questions = questions[:num_questions]
            
            return questions

        except Exception as e:
            logger.error(f"Error in content generation: {str(e)}")
            logger.error(f"Stack trace: {traceback.format_exc()}")
            raise

    except Exception as e:
        logger.error(f"❌ Error in generate_mcq_questions: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise ValueError(f"Failed to generate questions: {str(e)}")

# Add rate limiting and retry logic
def retry_with_backoff(retries=3, backoff_in_seconds=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retry_count = 0
            while retry_count < retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Check if it's a rate limit error
                    is_rate_limit = False
                    error_msg = str(e).lower()
                    if hasattr(e, "__module__") and "google.api_core.exceptions" in e.__module__:
                        is_rate_limit = True
                    elif "rate" in error_msg and "limit" in error_msg:
                        is_rate_limit = True
                        
                    if not is_rate_limit or retry_count == retries - 1:
                        raise
                        
                    retry_count += 1
                    wait_time = (backoff_in_seconds * (2 ** (retry_count - 1)))
                    logger.warning(f"Rate limit hit, waiting {wait_time} seconds...")
                    sleep(wait_time)
            return func(*args, **kwargs)
        return wrapper
    return decorator

def generate_interview_questions(prompt, num_questions):
    try:
        # Ensure num_questions is within the allowed range (10-15)
        num_questions = max(10, min(15, num_questions))
        
        logger.info(f"📝 Generating {num_questions} interview questions for: {prompt}")

        # Clean the prompt
        clean_prompt = ' '.join([
            word for word in prompt.split() 
            if word.lower() not in ['generate', 'interview', 'questions', 'about']
        ]).strip()

        prompt_template = f"""
Create exactly {num_questions} technical interview questions about {clean_prompt}.

IMPORTANT: Return ONLY a valid JSON array with this exact format, nothing else:
[
  {{
    "id": 1,
    "question": "Technical question about {clean_prompt}?",
    "answer": "Detailed explanation with: 1. Key concepts, 2. Examples, 3. Best practices",
    "difficulty": "beginner",
    "type": "theoretical"
  }}
]

Rules:
- Return only valid JSON, no other text
- Generate exactly {num_questions} questions
- Include both theoretical and practical questions
- Keep answers clear and concise
- Use proper JSON escaping for quotes
"""

        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 10000,
        }

        response = model.generate_content(
            contents=[{"role": "user", "parts": [{"text": prompt_template}]}],
            generation_config=generation_config
        )

        response_text = get_response_content(response)
        if not response_text:
            raise ValueError("Empty response from AI model")
        
        logger.debug(f"Raw interview questions response:\n{response_text[:500]}...")

        cleaned_text = clean_response_text(response_text)
        questions = json.loads(cleaned_text)
        
        if not isinstance(questions, list):
            questions = [questions]

        validated_questions = []
        required_fields = {'question', 'answer', 'difficulty', 'type'}

        for i, q in enumerate(questions[:num_questions]):
            if isinstance(q, dict) and all(k in q for k in required_fields):
                if 'id' not in q:
                    q['id'] = i + 1
                validated_questions.append(q)

        if not validated_questions or len(validated_questions) < num_questions:
            raise ValueError(f"Only {len(validated_questions)} valid questions generated out of {num_questions}")

        validated_questions = validated_questions[:num_questions]
        
        logger.info(f"✅ Successfully generated {len(validated_questions)} interview questions")
        return validated_questions

    except Exception as e:
        logger.error(f"❌ Error generating interview questions: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise ValueError(f"Failed to generate interview questions: {str(e)}")

def clean_response_text(text):
    """Clean and format the response text."""
    try:
        logger.debug(f"Raw text to clean: {text[:500]}...")
        
        # Remove any leading/trailing whitespace
        text = text.strip()
        
        # First try to find JSON content within markdown blocks
        json_patterns = [
            r'```json\s*([\s\S]*?)\s*```',  # JSON code blocks
            r'```\s*([\s\S]*?)\s*```',      # Any code blocks
            r'\{[\s\S]*\}|\[[\s\S]*\]'      # Raw JSON objects/arrays
        ]
        
        for pattern in json_patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            if matches:
                # Try each match until we find valid JSON
                for match in matches:
                    try:
                        cleaned = match.strip()
                        if cleaned.startswith('json'):
                            cleaned = cleaned[4:].strip()
                        # Verify it's valid JSON
                        json.loads(cleaned)
                        logger.debug(f"Successfully cleaned JSON: {cleaned[:200]}...")
                        return cleaned
                    except json.JSONDecodeError:
                        continue
        
        # If no valid JSON found in code blocks, try to clean the raw text
        cleaned = text
        # Remove common prefixes
        for prefix in ['json', 'JSON:', 'Response:', 'Here are']:
            if cleaned.lower().startswith(prefix.lower()):
                cleaned = cleaned[len(prefix):].strip()
        
        # Ensure proper JSON structure
        if not cleaned.startswith('['):
            if cleaned.startswith('{'):
                cleaned = f'[{cleaned}]'
            else:
                cleaned = f'[{cleaned}'
        if not cleaned.endswith(']'):
            cleaned = f'{cleaned}]'
        
        # Try to parse the cleaned text
        try:
            json.loads(cleaned)
            logger.debug(f"Successfully cleaned raw text to JSON: {cleaned[:200]}...")
            return cleaned
        except json.JSONDecodeError:
            # One last attempt: try to extract anything that looks like JSON
            json_pattern = r'(\[[\s\S]*\]|\{[\s\S]*\})'
            match = re.search(json_pattern, cleaned)
            if match:
                final_attempt = match.group(1)
                json.loads(final_attempt)  # Validate it's proper JSON
                return final_attempt
            
            raise ValueError("Could not find valid JSON in the response")

    except Exception as e:
        logger.error(f"Error cleaning response text: {str(e)}")
        logger.error(f"Original text causing error: {text[:500]}...")
        raise ValueError(f"Failed to clean response text: {str(e)}")
    
# API endpoint to generate MCQ questions
@app.route('/api/panel/generate-question', methods=['POST'])
def generate_mcq():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        
        # Get number of questions (ensure within bounds 10-15)
        num_questions = int(data.get('num_questions', 10))
        num_questions = max(10, min(15, num_questions))
        
        logger.info(f"Request to generate {num_questions} MCQ questions about: {prompt}")

        questions = generate_mcq_questions(prompt, num_questions)
        
        return jsonify({
            "success": True,
            "questions": questions,
            "type": "mcq",
            "count": len(questions)
        }), 200

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add endpoint for interview questions
@app.route('/api/panel/generate-interview-questions', methods=['POST'])
def generate_interview():
    try:
        data = request.get_json()
        if not data:
            raise ValueError("No data received")

        prompt = data.get('prompt', '').strip()
        if not prompt:
            raise ValueError("Prompt is required")
        
        num_questions = int(data.get('num_questions', 10))
        num_questions = max(10, min(15, num_questions))
        
        logger.info(f"📝 Generating {num_questions} interview questions for: {prompt}")

        try:
            questions = generate_interview_questions(prompt, num_questions)
            
            if not questions:
                raise ValueError("No questions generated")

            return jsonify({
                "success": True,
                "questions": questions,
                "type": "interview",
                "count": len(questions)
            }), 200

        except Exception as gen_error:
            logger.error(f"Generation error: {str(gen_error)}")
            return jsonify({
                "success": False,
                "error": "Failed to generate questions. Please try again."
            }), 500

    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

# Test endpoint
@app.route('/api/panel/test', methods=['GET'])
def test_endpoint():
    return jsonify({'status': 'ok', 'message': '✅ Question generation API is running'})

# Run Flask server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)