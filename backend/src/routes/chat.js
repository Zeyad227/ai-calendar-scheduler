const express = require('express');
const { protect } = require('../middleware/auth');
const groqService = require('../services/groqService');
const googleCalendarService = require('../services/googleCalendarService');
const Event = require('../models/Event');

const router = express.Router();

// Process natural language scheduling request
router.post('/schedule', protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Extract event details using Groq AI
    const extractedDetails = await groqService.extractEventDetails(message);

    if (extractedDetails.error) {
      return res.status(400).json({
        success: false,
        message: extractedDetails.error,
        needsClarification: true,
        clarificationQuestions: extractedDetails.clarificationQuestions,
      });
    }

    if (extractedDetails.needsClarification) {
      const response = await groqService.generateResponse(extractedDetails, 'clarify');
      return res.json({
        success: true,
        needsClarification: true,
        clarificationQuestions: extractedDetails.clarificationQuestions,
        message: response,
        extractedDetails,
      });
    }

    // Check availability in Google Calendar
    const availability = await googleCalendarService.checkAvailability(
      req.user._id,
      extractedDetails.startDateTime,
      extractedDetails.endDateTime
    );

    if (!availability.available) {
      // Suggest alternatives using AI
      const alternatives = await groqService.suggestAlternatives(
        availability.conflicts,
        extractedDetails
      );

      return res.json({
        success: false,
        hasConflicts: true,
        conflicts: availability.conflicts,
        alternatives: alternatives.suggestions,
        message: alternatives.message,
        originalRequest: extractedDetails,
      });
    }

    // Generate confirmation response
    const confirmationMessage = await groqService.generateResponse(extractedDetails, 'confirm');

    res.json({
      success: true,
      message: confirmationMessage,
      eventDetails: extractedDetails,
      readyToCreate: true,
    });

  } catch (error) {
    console.error('Chat schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process scheduling request',
      error: error.message,
    });
  }
});

// Confirm and create event
router.post('/confirm', protect, async (req, res) => {
  try {
    const { eventDetails, confirmed } = req.body;

    if (!confirmed) {
      return res.json({
        success: true,
        message: 'Event creation cancelled. Feel free to make another request!',
      });
    }

    // Create event in database
    const event = await Event.create({
      user: req.user._id,
      title: eventDetails.title,
      description: eventDetails.description,
      startDateTime: eventDetails.startDateTime,
      endDateTime: eventDetails.endDateTime,
      location: eventDetails.location,
      attendees: eventDetails.attendees?.map(email => ({ email })) || [],
      createdViaChat: true,
      chatContext: {
        originalMessage: eventDetails.originalMessage,
        extractedInfo: eventDetails,
        confidence: eventDetails.confidence,
      },
    });

    // Create event in Google Calendar
    try {
      const googleEvent = await googleCalendarService.createEvent(req.user._id, eventDetails);
      
      // Update event with Google Calendar ID
      event.googleEventId = googleEvent.id;
      await event.save();

      const successMessage = await groqService.generateResponse(eventDetails, 'created');

      res.json({
        success: true,
        message: successMessage,
        event: event,
        googleEvent: {
          id: googleEvent.id,
          htmlLink: googleEvent.htmlLink,
        },
      });

    } catch (googleError) {
      console.error('Google Calendar creation failed:', googleError);
      
      // Event created in DB but not in Google Calendar
      res.json({
        success: true,
        message: 'Event created successfully, but could not sync with Google Calendar. You may need to reconnect your Google account.',
        event: event,
        warning: 'Google Calendar sync failed',
      });
    }

  } catch (error) {
    console.error('Event confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message,
    });
  }
});

// Get chat history/context
router.get('/history', protect, async (req, res) => {
  try {
    const events = await Event.find({
      user: req.user._id,
      createdViaChat: true,
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('title startDateTime chatContext createdAt');

    res.json({
      success: true,
      data: {
        chatHistory: events,
      },
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error.message,
    });
  }
});

// Quick responses for common requests
router.post('/quick-action', protect, async (req, res) => {
  try {
    const { action, context } = req.body;

    let response;
    switch (action) {
      case 'show_today':
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayEvents = await googleCalendarService.getEvents(
          req.user._id,
          today.toISOString(),
          tomorrow.toISOString()
        );

        response = {
          message: `You have ${todayEvents.length} events today.`,
          events: todayEvents.map(event => ({
            title: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
          })),
        };
        break;

      case 'next_meeting':
        const upcomingEvents = await googleCalendarService.getEvents(
          req.user._id,
          new Date().toISOString()
        );
        
        const nextEvent = upcomingEvents[0];
        response = nextEvent
          ? {
              message: `Your next meeting is "${nextEvent.summary}" at ${new Date(nextEvent.start.dateTime || nextEvent.start.date).toLocaleString()}`,
              event: {
                title: nextEvent.summary,
                start: nextEvent.start.dateTime || nextEvent.start.date,
                location: nextEvent.location,
              },
            }
          : { message: "You don't have any upcoming meetings." };
        break;

      default:
        response = { message: "I didn't understand that action. Try asking me to schedule a meeting!" };
    }

    res.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process quick action',
      error: error.message,
    });
  }
});

module.exports = router;
