import { SendToWelcome,SendToIntroduction, SendToStart, SendToCompare, Next_Question, Interview_Ended, FollowupQuestion, Interview_Summary } from './apiService.js';
import { generateWelcomePrompt,generateIntroductionPrompt,interviewPrompts, generateSummaryPrompt } from '../assets/Prompt.js';

// Initialize interview state
let interviewQuestions = [];
let lastAskedQuestion = null;
const Company_Name = "IMMCO Software Solutions";
const store_conversation = {};
let candidateInfo = null;

// Add a flag to track if it's the last question's feedback
let isLastQuestionFeedback = false;

// Add function to fetch questions from database
const fetchInterviewQuestions = async (candidateId, postId) => {
  try {
    // First get candidate's level
    const levelResponse = await fetch(`http://localhost:5005/api/interview-level/${candidateId}`);
    if (!levelResponse.ok) {
      throw new Error('Failed to fetch candidate level');
    }
    const { level } = await levelResponse.json();

    // Then fetch questions based on level and post
    const questionsResponse = await fetch(`http://localhost:5005/api/interview-questions/${postId}/${level}`);
    if (!questionsResponse.ok) {
      throw new Error('Failed to fetch interview questions');
    }

    const data = await questionsResponse.json();
    
    if (!data.questions || data.questions.length === 0) {
      throw new Error('No questions available for this level');
    }

    // Store fetched questions
    interviewQuestions = data.questions;

    return {
      numberOfQuestions: interviewQuestions.length,
      questions: interviewQuestions,
      postId: postId,
      level: level
    };
  } catch (error) {
    console.error('Error fetching interview questions:', error);
    throw error;
  }
};

// Add a function to fetch candidate info 
const fetchCandidateInfo = async (candidateId) => {
  try {
    const response = await fetch(`http://localhost:5005/get-candidate-info/${candidateId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch candidate information');
    }
    
    const candidateData = await response.json();
    
    // Fetch post details
    const postResponse = await fetch(`http://localhost:5005/api/post/${candidateData.postId}`);
    if (!postResponse.ok) {
      throw new Error('Failed to fetch post information');
    }
    
    const postData = await postResponse.json();
    
    // Combine candidate and post data
    candidateInfo = {
      ...candidateData,
      postTitle: postData.title // Make sure this is being set
    };
    
    return candidateInfo;
  } catch (error) {
    console.error('Error in fetchCandidateInfo:', error);
    throw error;
  }
};

//Process interview transcript and handle different interview stages
export const processTranscript = async (transcript, questionAsked, additional, candidateId) => {
  try {
    // If no cached candidate info, fetch it
    if (!candidateInfo) {
      await fetchCandidateInfo(candidateId);
    }

    // If no cached questions, fetch them
    if (!interviewQuestions || interviewQuestions.length === 0) {
      await fetchInterviewQuestions(candidateId, candidateInfo.postId);
    }

    // Define prompts for different interview stages using the fetched name
    const prompts = {
      welcome: generateWelcomePrompt(Company_Name, candidateInfo.candidateName, candidateInfo.postTitle), // Add postTitle here
      introduction: generateIntroductionPrompt(candidateInfo.candidateName, transcript),
      start: interviewPrompts.generateStartPrompt(transcript),
      next_question: interviewPrompts.generateNextQuestionPrompt(candidateInfo.candidateName),
      interview_end: interviewPrompts.generateInterviewEndPrompt(candidateInfo.candidateName),
      summary: generateSummaryPrompt(JSON.stringify(store_conversation, null, 2)),
      followup: interviewPrompts.generateFollowupPrompt(questionAsked),
      compare: lastAskedQuestion ? 
        interviewPrompts.generateComparePrompt(
          lastAskedQuestion.question, 
          lastAskedQuestion.expected_answer, 
          transcript
        ) : "No previous question found.",
      comparefollowup: interviewPrompts.generateFollowupComparePrompt(questionAsked, transcript)
    };
    
    // Rest of the code remains the same...
    const modelMapping = {
      welcome: SendToWelcome,
      introduction: SendToIntroduction,
      start: SendToStart,
      compare: SendToCompare,
      next_question: Next_Question,
      followup: FollowupQuestion,
      comparefollowup: SendToCompare,
      interview_end: Interview_Ended,
      summary: Interview_Summary
    };

    if (additional === "generate") {
      const QuestionToBeAsked = getRandomQuestion();
      
      // If no more questions available, return null
      if (!QuestionToBeAsked) {
        // If this is the first time we're out of questions, save the conversation
        if (!isLastQuestionFeedback) {
          isLastQuestionFeedback = true;
          await saveConversation(candidateId);
        }
        return null;
      }
    
      // Find the next available question number
      let questionIndex = 1;
      while (store_conversation[`Question ${questionIndex}`]) {
        questionIndex++;
      }
    
      // Store the new question with the next available number
      store_conversation[`Question ${questionIndex}`] = QuestionToBeAsked;
    
      return QuestionToBeAsked;
    }
    

    if (prompts[additional] && modelMapping[additional]) {
      const response = await modelMapping[additional](prompts[additional]);
      
      // Pass candidateId here
      storeConversationByStage(additional, response, transcript, candidateId);
      
      if (additional === "compare" || additional === "comparefollowup") 
      {
        const { filteredResponse, coverage } = extractCoverageAndFilter(response);
        
        // Check if this is the last question and coverage is met
        if (!checkRemainingQuestions()) {
          if (coverage >= 60) { // Or whatever your threshold is
            // End interview after this response
            isLastQuestionFeedback = true;
          }
          // If coverage not met, let the normal followup flow continue
        }
        
        return [filteredResponse, coverage];
      }

      // Check if we should end interview after followup
      if (additional === "followup" && isLastQuestionFeedback) {
        isLastQuestionFeedback = false; // Reset the flag
        return Interview_Ended(prompts.interview_end);
      }

      if(additional === "summary")
      {
        const result = extractNumbers(response);
        await saveRankings(result, candidateId); // Pass candidateId here
        return result;
      }
          
      return response;
    }
    
    throw new Error("Invalid additional parameter");
  } catch (error) {
    console.error(`Error in processTranscript (${additional}):`, error);
    return "An error occurred. Please try again.";
  }
};


//Store conversation data based on interview stage
const storeConversationByStage = async (stage, response, transcript, candidateId) => {
  const stageMapping = {
    welcome: () => store_conversation["Welcome Message"] = response,

    introduction: () => {
      store_conversation["Candidate Welcome Reply"] = transcript;
      store_conversation["Introduction Question"] = response;
    },

    start: () => {  
      store_conversation["Candidate Introduction Reply"] = transcript;
      store_conversation["Start The Question Message"] = response;
    },

    compare: () => {
      let answerIndex = 1;
      while (store_conversation[`Candidate Answer ${answerIndex}`]) {
        answerIndex++;
      }
      store_conversation[`Candidate Answer ${answerIndex}`] = transcript;

      let feedbackIndex = 1;
      while (store_conversation[`Question_Feedback ${feedbackIndex}`]) {
        feedbackIndex++;
      }
      store_conversation[`Question_Feedback ${feedbackIndex}`] = response;
    },

    followup: () => {
      let followupIndex = 1;
      while (store_conversation[`Followup_Question ${followupIndex}`]) {
        followupIndex++;
      }
      store_conversation[`Followup_Question ${followupIndex}`] = response;
    },

    comparefollowup: () => {
      let followupAnswerIndex = 1;
      while (store_conversation[`Candidate Followup_Answer ${followupAnswerIndex}`]) {
        followupAnswerIndex++;
      }
      store_conversation[`Candidate Followup_Answer ${followupAnswerIndex}`] = transcript;

      let followupFeedbackIndex = 1;
      while (store_conversation[`Followup_Question_Feedback ${followupFeedbackIndex}`]) {
        followupFeedbackIndex++;
      }
      store_conversation[`Followup_Question_Feedback ${followupFeedbackIndex}`] = response;
    },

    interview_end: async () => {
      store_conversation["Interview_End"] = response;
      await saveConversation(candidateId); // Pass candidateId here
    }
  };

  if (stageMapping[stage]) {
    await stageMapping[stage]();
  }
};

// Update saveConversationToFile function to save to database
const saveConversation = async (candidateId) => {
  try {
    // Fetch candidate info if not already available
    if (!candidateInfo) {
      candidateInfo = await fetchCandidateInfo(candidateId);
    }

    if (!candidateId || !candidateInfo || !candidateInfo.postId) {
      console.error('Missing data:', { candidateId, candidateInfo });
      throw new Error('Missing required fields');
    }

    const response = await fetch('http://localhost:5005/save-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: store_conversation,
        candidateId: parseInt(candidateId, 10),
        postId: parseInt(candidateInfo.postId, 10)
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save conversation');
    }
    
    const result = await response.json();
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
};

// Update saveRankings function to save to database
const saveRankings = async (rankings, candidateId) => {
  try {
    // Fetch candidate info if not already available
    if (!candidateInfo) {
      candidateInfo = await fetchCandidateInfo(candidateId);
    }

    if (!rankings || !candidateId || !candidateInfo || !candidateInfo.postId) {
      console.error('Missing data:', { rankings, candidateId, candidateInfo });
      throw new Error('Missing required fields');
    }

    const rankingData = {
      rankings: [
        parseInt(rankings[0], 10), // fluency
        parseInt(rankings[1], 10), // subject knowledge
        parseInt(rankings[2], 10), // professional behavior
        rankings[3] // feedback text
      ],
      candidateId: parseInt(candidateId, 10),
      postId: parseInt(candidateInfo.postId, 10)
    };

    const response = await fetch('http://localhost:5005/save-rankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rankingData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save rankings');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving rankings:', error);
    throw error;
  }
};

//Extract coverage score from response
const extractCoverageAndFilter = (response) => {
  const coverageRegex = /coverage=(\d+)/i;
  const match = response.match(coverageRegex);
  
  let coverage = null;
  let filteredResponse = response;

  if (match) {
    coverage = parseInt(match[1], 10);
    filteredResponse = response.replace(coverageRegex, '').trim();
  }

  return { filteredResponse, coverage };
};


//Get random question from question pool
const getRandomQuestion = () => {
  // If no questions available or empty array, return null
  if (!interviewQuestions || interviewQuestions.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * interviewQuestions.length);
  const selectedQuestion = interviewQuestions[randomIndex];
  
  // Remove selected question from array
  interviewQuestions = interviewQuestions.filter((_, index) => index !== randomIndex);
  
  // Store last asked question for reference
  lastAskedQuestion = selectedQuestion;
  
  console.log(`Questions remaining: ${interviewQuestions.length}`); // Debug log
  
  return selectedQuestion.question;
};

// Add this new function to check remaining questions
export const checkRemainingQuestions = () => {
  return interviewQuestions && interviewQuestions.length > 0;
};

//Get the Ranking of the candidate
// Get the Ranking of the candidate
function extractNumbers(text) {
  const match = text.match(/Lan=(\d+)\s+Sub=(\d+)\s+Beh=(\d+)\s+Sum=(.+)/);

  if (match) {
      return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          match[4].trim()
      ];
  } else {
      return null;
  }
}


