import { DictionaryEntry } from '../types';

/**
 * Service to interact with External APIs
 * This serves as a gateway/adapter pattern.
 */

// Example: Free Dictionary API (No Key Required)
const DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

export const lookupWord = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    const response = await fetch(`${DICTIONARY_API_URL}/${word}`);
    
    if (!response.ok) {
      if (response.status === 404) return null; // Word not found
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    // The API returns an array, we take the first result
    return data[0] as DictionaryEntry;
  } catch (error) {
    console.error("Dictionary API Error:", error);
    return null;
  }
};

/**
 * Example Generic Fetch for other APIs (e.g. Weather, Wikipedia)
 * Use this pattern if you have an API Key
 */
/*
export const fetchCustomApi = async (endpoint: string) => {
    const API_KEY = process.env.YOUR_OTHER_API_KEY; 
    const response = await fetch(`https://api.example.com/${endpoint}?key=${API_KEY}`);
    return response.json();
}
*/
