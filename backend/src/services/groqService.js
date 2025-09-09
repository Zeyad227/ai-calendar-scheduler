const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async extractEventDetails(message) {
    try {
      const prompt = `
Extract event details from this natural language message and return a JSON object with the following structure:
{
  "title": "event title",
  "description": "event description (optional)",
  "startDateTime": "ISO date string",
  "endDateTime": "ISO date string", 
  "location": "location (optional)",
  "attendees": ["email1@example.com", "email2@example.com"],
  "confidence": 0.95,
  "needsClarification": false,
  "clarificationQuestions": []
}

Rules:
- If date/time is ambiguous, use reasonable defaults (e.g., if no year specified, use current year)
- If no end time specified, assume 1 hour duration for meetings, 30 minutes for calls
- If confidence is below 0.7, set needsClarification to true and provide clarification questions
- Extract email addresses from the message for attendees
- Use ISO 8601 format for dates
- If today's date is needed, assume it's ${new Date().toISOString().split('T')[0]}

Message: "${message}"

Return only valid JSON, no additional text:`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in extracting calendar event information from natural language. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('Groq API error:', error);
      return {
        error: 'Failed to process natural language input',
        needsClarification: true,
        clarificationQuestions: ['Could you please provide more specific details about the event?'],
      };
    }
  }

  async generateResponse(eventDetails, action = 'create') {
    try {
      const prompt = `
Generate a friendly, conversational response for a calendar scheduling assistant.

Action: ${action}
Event Details: ${JSON.stringify(eventDetails)}

Generate a response that:
- Confirms what was understood
- Shows the event details in a user-friendly way
- Asks for confirmation or clarification if needed
- Uses a helpful, professional tone
- Is concise but informative

Response:`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful calendar scheduling assistant. Generate friendly, professional responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('Groq response generation error:', error);
      return 'I understand you want to schedule an event. Could you please provide more details?';
    }
  }

  async suggestAlternatives(conflictingEvents, requestedEvent) {
    try {
      const prompt = `
The user wants to schedule: ${JSON.stringify(requestedEvent)}

But there are conflicts with existing events: ${JSON.stringify(conflictingEvents)}

Suggest 3 alternative time slots that would work better. Consider:
- Avoiding conflicts
- Staying within business hours (9 AM - 6 PM)
- Keeping the same day if possible, or suggesting nearby days
- Maintaining the requested duration

Return JSON with this structure:
{
  "suggestions": [
    {
      "startDateTime": "ISO date string",
      "endDateTime": "ISO date string",
      "reason": "why this time works better"
    }
  ],
  "message": "friendly explanation of the conflict and suggestions"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a scheduling assistant that helps resolve calendar conflicts.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 500,
      });

      return JSON.parse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Groq alternatives error:', error);
      return {
        suggestions: [],
        message: 'I found a scheduling conflict. Could you suggest an alternative time?',
      };
    }
  }
}

module.exports = new GroqService();
