// apiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEYS, MODEL_CONFIG } from '../assets/ApiKeys.js';

//Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI);


//Initialize different Gemini models for specific tasks
const models = {
  normal: genAI.getGenerativeModel({ model: MODEL_CONFIG.MODELS.NORMAL }),
  welcome: genAI.getGenerativeModel({ model: MODEL_CONFIG.MODELS.WELCOME }),
  introduction: genAI.getGenerativeModel({ model: MODEL_CONFIG.MODELS.INTRODUCTION }),
  startQuestions: genAI.getGenerativeModel({ model: MODEL_CONFIG.MODELS.START_QUESTIONS }),
  compare: genAI.getGenerativeModel({ model: MODEL_CONFIG.MODELS.COMPARE })
};


//Convert audio to text using Deepgram API
export const sendToDeepgram = async (audioBlob) => {
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEYS.DEEPGRAM}`,
        'Content-Type': 'audio/wav',
      },
      body: audioBlob,
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending audio to Deepgram:', error);
    throw error;
  }
};


//Send text to Gemini model and get response
const sendToGeminiModel = async (model, text, maxTokens) => {
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text();
  } catch (error) {
    console.error(`Error sending text to Gemini model:`, error);
    throw error;
  }
};


//Export specialized functions for different interview stages
export const Next_Question = (text) => 
  sendToGeminiModel(models.normal, text, MODEL_CONFIG.TOKEN_LIMITS.NORMAL);

export const SendToWelcome = (text) => 
  sendToGeminiModel(models.welcome, text, MODEL_CONFIG.TOKEN_LIMITS.WELCOME);

export const SendToIntroduction = (text) => 
  sendToGeminiModel(models.introduction, text, MODEL_CONFIG.TOKEN_LIMITS.INTRODUCTION);

export const SendToStart = (text) => 
  sendToGeminiModel(models.startQuestions, text, MODEL_CONFIG.TOKEN_LIMITS.START);

export const SendToCompare = (text) => 
  sendToGeminiModel(models.compare, text, MODEL_CONFIG.TOKEN_LIMITS.COMPARE);

export const FollowupQuestion = (text) => 
  sendToGeminiModel(models.normal, text, MODEL_CONFIG.TOKEN_LIMITS.FOLLOWUP);

export const Interview_Ended = (text) => 
  sendToGeminiModel(models.normal, text, MODEL_CONFIG.TOKEN_LIMITS.INTERVIEW_END);

export const Interview_Summary = (text) => 
  sendToGeminiModel(models.normal, text, MODEL_CONFIG.TOKEN_LIMITS.INTERVIEW_END);