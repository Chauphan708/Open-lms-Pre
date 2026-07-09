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

export interface MinhqndDefinition {
  definition: string;
  definition_lang: string;
  example: string | null;
  pos: string;
  sub_pos: string | null;
  source: string;
  links: string[];
}

export interface MinhqndResult {
  lang_code: string;
  lang_name: string;
  audio: string | null;
  meanings: MinhqndDefinition[];
  pronunciations: {
    ipa: string;
    region: string | null;
  }[];
  translations: {
    lang_code: string;
    translation: string;
    lang_name: string;
  }[];
}

export interface MinhqndLookupResponse {
  exists: boolean;
  word: string;
  results: MinhqndResult[];
}

export const lookupMultilingualWord = async (word: string): Promise<MinhqndLookupResponse | null> => {
  try {
    const response = await fetch(`https://dict.minhqnd.com/api/v1/lookup?word=${encodeURIComponent(word)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data as MinhqndLookupResponse;
  } catch (error) {
    console.error("Multilingual Dictionary API Error:", error);
    return null;
  }
};
