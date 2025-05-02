import React, { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Send, Clock, ArrowRight, FileText, CheckCircle, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from "react-router-dom";

import {useAudioRecorder} from '../backend/useAudioRecorder';
import { sendToDeepgram } from '../backend/apiService';
import { processTranscript } from '../backend/messagetweaks';

import toast, { Toaster } from 'react-hot-toast';

export const Interview = () => {  
  // Get candidateId and postId from URL parameters
  const { candidateId, postId } = useParams();
  
  // UI State Management
  const [userMessage, setUserMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('Interview will start soon...');
  const [isLoading, setIsLoading] = useState(true); 
  const [countdownTime, setCountdownTime] = useState(100);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [Ranking,SetRanking] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isInterviewEnding, setIsInterviewEnding] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [generateQuestionCount, setGenerateQuestionCount] = useState(1);
  const [followupQuestionCount, setFollowupQuestionCount] = useState(0);

  // Interview Flow Control
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [QuestionAsked, SetQuestionAsked] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [generateComplete, setGenerateComplete] = useState(false);
  const [compareComplete, setCompareComplete] = useState(false);
  const [isFollowupQuestion, setIsFollowupQuestion] = useState(false);
  const [Coverage, setCoverage] = useState(null);
  const [FollowupCount, SetFollowupCount] = useState(0);
  const [CurrentInput, SetCurrentInput] = useState('');
  const [maxFollowup, setMaxFollowup] = useState(3); // Default to 3
  const [isQuestionActive, setIsQuestionActive] = useState(false);

  // Refs and Hooks
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { startRecording, stopRecording, error } = useAudioRecorder();

  // Add new state to track end speech completion
  const [endSpeechCompleted, setEndSpeechCompleted] = useState(false);

  // Add near the top of the component, after state declarations
  useEffect(() => {
    const fetchTestConfig = async () => {
      try {
        const response = await fetch(`http://localhost:5005/api/test-config/${postId}`);
        const data = await response.json();
        
        if (response.ok) {
          setCountdownTime(data.time * 60); // Convert minutes to seconds
          setCoverage(data.coverage); // Use for coverage threshold
          setMaxFollowup(data.followup); // Store the fetched followup count
          // We'll use the existing FollowupCount state with the max from config
          const maxFollowup = data.followup;
          
          // Update the followup questions effect to use fetched value
          if (Coverage < data.coverage && FollowupCount < maxFollowup) {
            // Continue with followup questions
          }
        }
      } catch (error) {
        console.error('Error fetching test config:', error);
        toast.error('Failed to load test configuration');
      }
    };
  
    if (postId) {
      fetchTestConfig();
    }
  }, [postId]);

  // Main function to process user responses and generate system responses
  const processUserResponse = async (text, question, additional) => {
    try {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsLoading(true);

      // Add this check for question activation
      if (additional === "generate") {
        setIsQuestionActive(true);
      }
  
      try {
        const processedResponse = await processTranscript(text, question, additional, candidateId);
  
        if(additional=="summary")
        {
          return processedResponse
        }

        // Handle case when no more questions are available
        if (processedResponse === null && additional === "generate") {
          // End interview after last question's feedback
          setIsInterviewEnding(true);
          const result = await processUserResponse("0", "0", "interview_end");
          if (result) {
            setCurrentQuestion(result[3]);
            SetRanking(result);
          }
          return;
        }
  
        let textToSpeak = '';
  
        // Handle response with coverage information
        if (Array.isArray(processedResponse)) {
          const [filteredResponse, coverage] = processedResponse;
          setCurrentQuestion(filteredResponse);
          setCoverage(coverage);
          textToSpeak = filteredResponse;
        } else {
          setCurrentQuestion(processedResponse);
          textToSpeak = processedResponse;
        }
  
        // Update interview flow states based on response type
        if (additional === "generate") {
          setGenerateComplete(true);
          setWaitingForInput(true);
          setInterviewStarted(true);
          // Store the generated question in history with number
          setQuestionHistory(prev => [...prev, { 
            type: 'generate',
            questionNumber: generateQuestionCount,
            question: processedResponse,
            response: null
          }]);
          setGenerateQuestionCount(prev => prev + 1);
          setFollowupQuestionCount(0); // Reset followup counter for new question
        } else if (additional === "compare") {
          setCompareComplete(true);
          // Update the last question's response
          setQuestionHistory(prev => prev.map((item, index) => {
            if (index === prev.length - 1) {
              return { ...item, response: text };
            }
            return item;
          }));
        } else if (additional === "followup") {
          setWaitingForInput(true);
          setIsFollowupQuestion(true);
          // Store the followup question with letter
          setQuestionHistory(prev => [...prev, { 
            type: 'followup',
            questionNumber: String.fromCharCode(65 + followupQuestionCount), // Convert 0->A, 1->B, etc.
            question: processedResponse,
            response: null
          }]);
          setFollowupQuestionCount(prev => prev + 1);
        } else if (additional === "comparefollowup") {
          setCompareComplete(true);
          setIsFollowupQuestion(false);
          // Update the last followup question's response
          setQuestionHistory(prev => prev.map((item, index) => {
            if (index === prev.length - 1) {
              return { ...item, response: text };
            }
            return item;
          }));
        }

        // Modify the processUserResponse function where it handles "interview_end"
        if (additional === "interview_end") {
          try {
            const result = await processTranscript(text, question, additional, candidateId);
            if (result) {
              setCurrentQuestion(result[3]);
              SetRanking(result);
              
              // Generate and play the end speech
              const response = await fetch("http://localhost:5005/speak", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: result[3] }),
              });
        
              if (!response.ok) throw new Error("Failed to fetch audio");
        
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              
              const audio = new Audio(url);
              setCurrentAudio(audio);
              setIsSpeaking(true);
        
              // Add event listener for speech completion
              audio.onended = () => {
                setIsSpeaking(false);
                setCurrentAudio(null);
                setEndSpeechCompleted(true); // Set this to true when speech ends
              };
        
              audio.play().catch((err) => {
                setIsSpeaking(false);
                setCurrentAudio(null);
                setEndSpeechCompleted(true); // Set to true even if audio fails
              });
            }
          } catch (error) {
            console.error('Error:', error);
            setEndSpeechCompleted(true); // Set to true on error to ensure UI progression
          }
        }
  
        setIsSpeaking(true);
  
        // Generate and play audio response
        try {
          const response = await fetch("http://localhost:5005/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textToSpeak }),
          });
  
          if (!response.ok) throw new Error("Failed to fetch audio");
  
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioSrc(url);
          playAudio(url);
        } catch (error) {
          // Log error but don't block interview flow
          toast.error('Audio generation failed. Interview will continue without audio.');
          // Immediately set speaking to false to continue interview
          setIsSpeaking(false);
        }
      } catch (error) {
        toast.error('Error occured while processing response.');
        setCurrentQuestion("Could not generate next question. Please try again.");
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
        SetCurrentInput(additional);
      }
    } catch (error) {
      // ... error handling ...
    }
  };

  // Automatic question generation after initial setup
  useEffect(() => {
    let timeoutId;
    if (QuestionAsked === 2 && !isSpeaking && !isProcessing && !generateComplete && !isInterviewEnding) {
      timeoutId = setTimeout(async () => {
        await processUserResponse("0", "0", "generate");
      }, 500);
    }
    return () => clearTimeout(timeoutId);
  }, [QuestionAsked, isSpeaking, isProcessing, generateComplete, isInterviewEnding]);

  // Handle follow-up questions based on coverage
  useEffect(() => {
    let timeoutId;
    if (compareComplete && !isSpeaking && !isProcessing) {
      timeoutId = setTimeout(async () => {
        if (Coverage < 60 && FollowupCount < maxFollowup) { // Use maxFollowup here
          await processUserResponse("0", currentQuestion, "followup");
          SetFollowupCount(FollowupCount + 1);
          setIsFollowupQuestion(true);
        } else {
          await processUserResponse("0", "0", "next_question");
          SetFollowupCount(0);
          SetQuestionAsked(2);
          setGenerateComplete(false);
          setIsFollowupQuestion(false);
        }
        setCompareComplete(false);
      }, 500);
    }
    return () => clearTimeout(timeoutId);
  }, [compareComplete, isSpeaking, isProcessing, Coverage, maxFollowup]); // Add maxFollowup to dependencies

  // Automatic microphone activation based on conversation state
  useEffect(() => {
    const ToggleSpeaking = async () => {
      if (!isSpeaking) {
        if (isInterviewEnding) {
          // If mic is on, turn it off
          if (isListening) {
            await handleMicToggle();
          }
          // Get summary without activating mic
          const result = await processUserResponse("0", "0", "summary");
          SetRanking(result);
          return; // Exit early to prevent any mic activation
        }
        
        // Handle other cases where we want to activate mic
        else if (!isListening && 
          !isInterviewEnding && // Add check for interview ending
          (CurrentInput === "welcome" || 
           CurrentInput === "introduction" || 
           CurrentInput === "generate" || 
           CurrentInput === "followup")) {
          await handleMicToggle();
        }
      }
    };

    ToggleSpeaking();
  }, [isSpeaking, CurrentInput, isInterviewEnding]); // Add isInterviewEnding to dependencies

  // Handle microphone toggle and audio processing
  const handleMicToggle = async () => {
    if (isListening) {
      setIsListening(false);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        try {
          const transcriptResult = await sendToDeepgram(audioBlob);
          if (transcriptResult?.results?.channels[0]?.alternatives[0]?.transcript) {
            const newTranscript = transcriptResult.results.channels[0].alternatives[0].transcript;
            setTranscript(newTranscript);

            if (!isProcessing) {
              if (QuestionAsked === 0) {
                await processUserResponse(newTranscript, "0", "introduction");
                SetQuestionAsked(1);
              } else if (QuestionAsked === 1) {
                await processUserResponse(newTranscript, currentQuestion, "start");
                SetQuestionAsked(2);
              } else if (waitingForInput) {
                if (isFollowupQuestion) {
                  await processUserResponse(newTranscript, currentQuestion, "comparefollowup");
                } else {
                  await processUserResponse(newTranscript, "0", "compare");
                }
                setWaitingForInput(false);
              }
            }
          }
        } catch (error) {
          toast.error('Error occured while processing audio.');
        }
      }
    } else {
      setIsListening(true);
      setTranscript('');
      await startRecording();
    }
  };

  // Handle audio playback
  const playAudio = (audioUrl, isWelcome = false) => {
    if (!audioUrl || isSpeaking) return;

    // Stop any existing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    const audio = new Audio(audioUrl);
    
    // Set up event listeners before playing
    audio.onended = async () => {
      setIsSpeaking(false);
      setCurrentAudio(null);
      
      if (isWelcome) {
        setWelcomeSent(true);
        localStorage.setItem('audioInitialized', 'true');
        // Turn on mic after welcome message ends
        if (!isListening) {
          await handleMicToggle();
        }
      }
    };
    
    audio.onerror = (error) => {
      setIsSpeaking(false);
      setCurrentAudio(null);
      toast.error('Audio playback failed');
    };

    // Set states and play audio
    setCurrentAudio(audio);
    setIsSpeaking(true);
    
    audio.play().catch((err) => {
      setIsSpeaking(false);
      setCurrentAudio(null);
      toast.error('Audio playback failed. Interview will continue.');
    });
  };

  //Stop Audio playback
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  };

  // Text input handlers
  const handleSendMessage = async () => {
    // Only allow sending message if mic is on
    if (userMessage.trim() && !isProcessing && isListening) {
      const message = userMessage;
      setUserMessage("");
      setTranscript(message);
  
      // Turn off mic first
      await handleMicToggle();  // This will stop recording
  
      if (QuestionAsked === 0) {
        await processUserResponse(message, "0", "introduction");
        SetQuestionAsked(1);
      } else if (QuestionAsked === 1) {
        await processUserResponse(message, currentQuestion, "start");
        SetQuestionAsked(2);
      } else if (waitingForInput) {
        if (isFollowupQuestion) {
          await processUserResponse(message, currentQuestion, "comparefollowup");
        } else {
          await processUserResponse(message, "0", "compare");
        }
        setWaitingForInput(false);
      }
    } else if (!isListening) {
      // Show toast message if trying to send without mic on
      toast.error('Please wait for the microphone to activate before sending.');
    }
  };

  // Textarea auto-resize handler
  const handleTextareaInput = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setUserMessage(textarea.value);
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSpeaking) {
        toast.error('Please wait for the speech to finish.');
      } else if (!isListening) {
        toast.error('Please wait for the microphone to activate before sending.');
      } else {
        handleSendMessage();
      }
    }
  };

  // Update the handleLeave function to save interview data
const handleLeave = async () => {
  try {
    await saveFinalData(Ranking);
    navigate("/"); // Changed from "/ranking" to "/"
  } catch (error) {
    toast.error("Error saving interview data");
    // Still navigate even if there's an error
    navigate("/");
  }
};

  // Error handling for recording
  useEffect(() => {
    if (error) {
      toast.error('An error occured during recording.');
      setIsListening(false);
      setCurrentQuestion("There was an error with the recording. Please try again.");
    }
  }, [error]);

  // Initialize welcome message
  useEffect(() => {
    let isActive = true; // Add flag to prevent multiple initializations

    if (!welcomeSent && candidateId) {
      const initializeInterview = async () => {
        try {
          setIsLoading(true);
          
          // Check if already initialized to prevent duplicate calls
          if (localStorage.getItem('audioInitialized')) {
            return;
          }

          const welcomeResponse = await processTranscript("0", "0", "welcome", candidateId);
          
          // Only proceed if component is still mounted
          if (!isActive) return;

          const audioResponse = await fetch("http://localhost:5005/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: welcomeResponse }),
          });

          if (!audioResponse.ok) throw new Error("Failed to fetch welcome audio");
          if (!isActive) return;

          const blob = await audioResponse.blob();
          const url = URL.createObjectURL(blob);
          
          setCurrentQuestion(welcomeResponse);
          playAudio(url, true);
        } catch (error) {
          if (isActive) {
            toast.error('Failed to start interview');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      initializeInterview();
    }

    // Cleanup function
    return () => {
      isActive = false;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [candidateId, welcomeSent]);

  // Countdown timer
  useEffect(() => {
    if (!interviewStarted || isLoading || isProcessing || isSpeaking) return; // Add pause conditions

    if (countdownTime <= 0 && !isInterviewEnding) {
      const endInterview = async () => {
        setIsInterviewEnding(true);
        
        // Force stop all ongoing processes
        setIsLoading(false);
        setIsProcessing(false);
        setWaitingForInput(false);
        setGenerateComplete(false);
        setCompareComplete(false);
        
        // Stop audio playback if any
        if (isSpeaking) {
          stopAudio();
        }
        
        // Stop microphone if active
        if (isListening) {
          await handleMicToggle();
        }
        
        // Get final evaluation and set it directly
        const result = await processUserResponse("0", "0", "interview_end");
        if (result) {
          setCurrentQuestion(result[3]); // Set the message from result
          SetRanking(result);
        }
      };
  
      endInterview();
      return;
    }
  
    if (countdownTime > 0) {
      const interval = setInterval(() => {
        setCountdownTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
  
      return () => clearInterval(interval);
    }
  }, [countdownTime, interviewStarted, isLoading, isProcessing, isSpeaking]); // Add dependencies

  // Format time display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Update the FeedbackModal component
const FeedbackModal = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Interview Feedback</h2>
        <p className="text-gray-600 mb-4">
          Please share your feedback about the interview experience:
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
            placeholder="Your feedback here..."
            required
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

  // Update the saveFinalData function
const saveFinalData = async (rankingsData, feedback = null) => {
  try {
    const interviewResponse = await fetch("http://localhost:5005/save-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: parseInt(candidateId, 10), // Use from params
        postId: parseInt(postId, 10), // Use from params
        interviewStage: 2,
        selected: 'no',
        reportToHr: 'no',
        interviewFeedback: feedback,
        progress: 'Completed'
      })
    });

    if (!interviewResponse.ok) {
      const errorData = await interviewResponse.json();
      throw new Error(errorData.error || 'Failed to save interview data');
    }

    return await interviewResponse.json();
  } catch (error) {
    throw error;
  }
};

  // Update the handlePassQuestion function
const handlePassQuestion = async () => {
  if (isProcessing || isSpeaking || !isQuestionActive) return;
  
  try {
    setIsProcessing(true);
    
    // Turn off microphone if it's on
    if (isListening) {
      await handleMicToggle(); // This will turn off the mic
    }
    
    // Update question history
    setQuestionHistory(prev => {
      const lastQuestion = prev[prev.length - 1];
      if (lastQuestion && !lastQuestion.response) {
        return prev.map((item, index) => {
          if (index === prev.length - 1) {
            return {
              ...item,
              response: 'Question Passed',
              isPassed: true,
              timestamp: new Date().toISOString()
            };
          }
          return item;
        });
      }
      return prev;
    });

    // Reset question active state
    setIsQuestionActive(false);
    
    // Generate new question and check if it's null (no more questions)
    const response = await processUserResponse("0", "0", "generate");
    
    // If response is null, it means no more questions are available
    if (response === null) {
      setIsInterviewEnding(true);
      // Get final evaluation
      const result = await processUserResponse("0", "0", "interview_end");
      if (result) {
        setCurrentQuestion(result[3]);
        SetRanking(result);
      }
    }
    
  } catch (error) {
    toast.error('Failed to pass question');
  } finally {
    setIsProcessing(false);
  }
};

  useEffect(() => {
    return () => {
      // Cleanup function
      localStorage.removeItem('audioInitialized');
    };
  }, []);

  // Add this effect near other useEffect hooks
  useEffect(() => {
    // Clear audio initialization on component mount
    localStorage.removeItem('audioInitialized');
    
    // Cleanup on unmount
    return () => {
      localStorage.removeItem('audioInitialized');
    };
  }, []);

  // Add near other useEffect hooks
  useEffect(() => {
    return () => {
      // Cleanup function
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  // Add states for button loading
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Timer Display - Enhanced */}
      {interviewStarted && (
        <div className="fixed top-6 right-6 z-30">
          <div className="bg-white shadow-lg rounded-2xl px-6 py-3 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Clock className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-red-600 tabular-nums">
                {formatTime(countdownTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* History Sidebar - Enhanced */}
      {questionHistory.length > 0 && (
        <div className="fixed left-6 top-6 bottom-6 w-96 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden z-20 border border-gray-100">
          <div className="p-6 border-b border-gray-100 backdrop-blur-lg bg-white/50">
            <h3 className="text-xl font-bold text-gray-800">Interview Progress</h3>
            <p className="text-sm text-gray-500 mt-1">Question History & Responses</p>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)] custom-scrollbar">
            {questionHistory.map((item, index) => (
              <div 
                key={index} 
                className={`p-6 rounded-xl space-y-3 transition-all duration-200 ${
                  item.type === 'followup' 
                    ? 'bg-blue-50/50 border border-blue-100' 
                    : 'bg-gray-50/50 border border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === 'followup' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {item.type === 'followup' ? item.questionNumber : item.questionNumber}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.question}</p>
                    {item.response && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-200">
                        {item.isPassed ? (
                          <span className="text-sm text-yellow-600 font-medium flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" />
                            Question Passed
                          </span>
                        ) : (
                          <p className="text-sm text-gray-600">{item.response}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area - Enhanced */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-y-1/2 transition-all duration-300 ${
        questionHistory.length > 0 
          ? 'translate-x-[calc(-50%+200px)]'
          : '-translate-x-1/2'
      }`}>
        {/* Question Display */}
        <div className="w-full max-w-3xl mx-auto px-6 mb-12">
          <div className="bg-white shadow-xl rounded-2xl p-8 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            
            {isLoading ? (
              <div className="h-24 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-500 font-medium">Processing...</p>
              </div>
            ) : (
              <p className="text-2xl font-medium text-gray-800 leading-relaxed">
                {currentQuestion}
              </p>
            )}
          </div>
        </div>

        {/* Microphone and Visual Feedback */}
        <div className="flex flex-col items-center gap-8">
          <button
            onClick={handleMicToggle}
            disabled={isLoading || isSpeaking}
            className={`p-8 rounded-full transition-all duration-300 transform ${
              isListening 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 scale-110 shadow-lg shadow-green-500/20' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <div className={`relative ${isListening ? 'animate-pulse' : ''}`}>
              <Mic className={`w-10 h-10 ${isListening ? 'text-white' : 'text-gray-700'}`} />
              {isListening && (
                <div className="absolute inset-0 -m-4 rounded-full border-4 border-green-400 animate-ping" />
              )}
            </div>
          </button>

{/* Transcript Display - Fixed with better scrolling */}
{transcript && (
  <div className="w-full max-w-2xl mx-auto px-6 mb-8">
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words pr-2">
            {transcript}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
        </div>
      </div>

      {/* Text Input Area - Enhanced */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 shadow-xl">
        <div className={`p-6 transition-all duration-300 ${
          questionHistory.length > 0 
            ? 'max-w-3xl mx-auto transform translate-x-[200px]'
            : 'max-w-3xl mx-auto'
        }`}>
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={userMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[50px] max-h-[200px] resize-none"
                rows={1}
              />
              {isSpeaking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse" />
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || isSpeaking || !isListening}
              className={`p-3 rounded-xl transition-all duration-200 ${
                (!isListening || isSpeaking)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
              }`}
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons - Enhanced */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        <button
          onClick={handlePassQuestion}
          disabled={isProcessing || isSpeaking || !isQuestionActive || QuestionAsked < 2}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center gap-2 ${
            isProcessing || isSpeaking || !isQuestionActive || QuestionAsked < 2
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-500/25'
          }`}
          title="Pass Question"
        >
          <ArrowRight className="w-5 h-5" />
          <span className="text-sm font-medium">Pass</span>
        </button>
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 flex items-center gap-2"
          title="End Interview"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm font-medium">End</span>
        </button>
      </div>

      {/* Leave Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Leave Interview?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end the interview? Any unsaved responses will be lost.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Show Ranking after interview */}
        {Ranking && endSpeechCompleted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurred backdrop */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
            
            {/* Modal content - Improved sizing and layout */}
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl">
              {/* Decorative top bar */}
              <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600" />
              
              <div className="p-8 relative">
                {/* Header section */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Interview Complete
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Thank you for participating in the interview
                  </p>
                </div>

                {/* Feedback message */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
                  <p className="text-gray-600 leading-relaxed">
                    {Ranking[3]}
                  </p>
                </div>

                {/* Score grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* Fluency Score */}
                  <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-blue-600">
                        {Ranking[0]}/10
                      </div>
                      <div className="text-sm font-medium text-blue-600/70">
                        Fluency
                      </div>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(Ranking[0] / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Subject Knowledge Score */}
                  <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-100">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-purple-600">
                        {Ranking[1]}/10
                      </div>
                      <div className="text-sm font-medium text-purple-600/70">
                        Subject Knowledge
                      </div>
                    </div>
                    <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-1000"
                        style={{ width: `${(Ranking[1] / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Behavior Score */}
                  <div className="bg-green-50/50 rounded-lg p-4 border border-green-100">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-green-600">
                        {Ranking[2]}/10
                      </div>
                      <div className="text-sm font-medium text-green-600/70">
                        Professional Behavior
                      </div>
                    </div>
                    <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-1000"
                        style={{ width: `${(Ranking[2] / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={async () => {
                      setIsCompleting(true);
                      try {
                        await saveFinalData(Ranking);
                        navigate("/thank-you");
                      } catch (error) {
                        toast.error("Error saving interview data");
                      } finally {
                        setIsCompleting(false);
                      }
                    }}
                    disabled={isCompleting}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
                  >
                    {isCompleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Complete Interview</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    disabled={isSubmittingFeedback}
                    className="px-6 py-2.5 border-2 border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 flex items-center gap-2"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        <span>Provide Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFeedbackModal && (
          <FeedbackModal
            onSubmit={async (feedback) => {
              setIsSubmittingFeedback(true);
              try {
                await saveFinalData(Ranking, feedback);
                toast.success("Interview data and feedback saved successfully!");
                setShowFeedbackModal(false);
                navigate("/thank-you");
              } catch (error) {
                toast.error("Error saving interview data");
              } finally {
                setIsSubmittingFeedback(false);
              }
            }}
          />
        )}
        <Toaster/>
    </div>
  );
};