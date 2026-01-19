/**
 * Utility functions for cleaning and sanitizing AI-generated responses
 * to ensure clean, polished outputs without gibberish or formatting artifacts
 */

/**
 * Cleans text by removing markdown code blocks, extra whitespace, and formatting artifacts
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  
  let cleaned = text.trim();
  
  // Remove markdown code blocks (```json, ```, etc.)
  cleaned = cleaned.replace(/^```(?:json|javascript|typescript)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/```\s*$/gm, '');
  
  // Remove any leading/trailing explanatory text patterns
  cleaned = cleaned.replace(/^(?:Here'?s?|Here is|The (?:response|output|result)|JSON:|Response:)\s*/i, '');
  cleaned = cleaned.replace(/\s*(?:That'?s?|This is|End of response|That'?s all)\.?\s*$/i, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Extracts and cleans JSON from AI response text
 * Handles cases where AI adds markdown, explanatory text, or other formatting
 */
export function extractAndCleanJSON(text: string): string | null {
  if (!text) {
    return null;
  }
  
  const cleaned = cleanText(text);
  
  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  return null;
}

/**
 * Parses JSON from AI response with robust error handling and cleaning
 */
export function parseAIJSON<T = unknown>(text: string): T | null {
  try {
    const jsonString = extractAndCleanJSON(text);
    if (!jsonString) {
      return null;
    }
    
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse AI JSON response:', error);
    return null;
  }
}

/**
 * Cleans and sanitizes string fields in parsed AI data
 * Removes common artifacts, fixes encoding issues, and ensures proper formatting
 */
export function sanitizeStringField(value: unknown): string {
  if (typeof value !== 'string') {
    return String(value || '').trim();
  }
  
  let cleaned = value.trim();
  
  // Remove common AI artifacts
  cleaned = cleaned.replace(/^["']|["']$/g, ''); // Remove surrounding quotes if present
  cleaned = cleaned.replace(/\\n/g, '\n'); // Convert escaped newlines
  cleaned = cleaned.replace(/\\"/g, '"'); // Convert escaped quotes
  cleaned = cleaned.replace(/\\'/g, "'"); // Convert escaped apostrophes
  
  // Remove markdown formatting that might have leaked through
  // Handle **text** (bold) - remove asterisks but keep the text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold with **
  cleaned = cleaned.replace(/\*\*([^*]*)\*\*/g, '$1'); // Bold with ** (fallback)
  // Handle *text* (italic or bold) - remove asterisks but keep the text
  cleaned = cleaned.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1'); // Italic with single *
  // Handle `text` (code) - remove backticks but keep the text
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1'); // Code with backticks
  // Remove any remaining standalone asterisks that might be artifacts
  cleaned = cleaned.replace(/\*\s+/g, ''); // Remove asterisk followed by space
  cleaned = cleaned.replace(/\s+\*/g, ''); // Remove space followed by asterisk
  
  // Remove excessive punctuation
  cleaned = cleaned.replace(/[.]{3,}/g, '...');
  cleaned = cleaned.replace(/[!]{2,}/g, '!');
  cleaned = cleaned.replace(/[?]{2,}/g, '?');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Recursively cleans all string fields in an object/array
 */
export function sanitizeAIResponse<T>(data: unknown): T {
  if (data === null || data === undefined) {
    return data as T;
  }
  
  if (typeof data === 'string') {
    return sanitizeStringField(data) as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeAIResponse(item)) as T;
  }
  
  if (typeof data === 'object' && data !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        cleaned[key] = sanitizeStringField(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item => sanitizeAIResponse(item));
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = sanitizeAIResponse(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
  
  return data as T;
}

/**
 * Cleans plain text AI responses (non-JSON)
 */
export function cleanPlainTextResponse(text: string): string {
  if (!text) {
    return '';
  }
  
  let cleaned = cleanText(text);
  
  // Additional cleaning for plain text
  cleaned = sanitizeStringField(cleaned);
  
  // Remove any remaining markdown artifacts
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, ''); // Headers
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ''); // List markers at start of lines
  
  return cleaned.trim();
}

