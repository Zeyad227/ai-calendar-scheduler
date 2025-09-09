const express = require('express');
const { protect } = require('../middleware/auth');
const Event = require('../models/Event');
const googleCalendarService = require('../services/googleCalendarService');

const router = express.Router();

// Get all user events
router.get('/', protect, async (req, res) => {
  try {
    const { start, end, limit = 50 } = req.query;

    const filter = { user: req.user._id };
    
    if (start || end) {
      filter.startDateTime = {};
      if (start) filter.startDateTime.$gte = new Date(start);
      if (end) filter.startDateTime.$lte = new Date(end);
    }

    const events = await Event.find(filter)
      .sort({ startDateTime: 1 })
      .limit(parseInt(limit))
      .populate('user', 'name email');

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
      },
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
});

// Get single event
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('user', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: {
        event,
      },
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message,
    });
  }
});

// Create event manually
router.post('/', protect, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      user: req.user._id,
    };

    // Create event in database
    const event = await Event.create(eventData);

    // Create in Google Calendar if user is connected
    try {
      const googleEvent = await googleCalendarService.createEvent(req.user._id, eventData);
      event.googleEventId = googleEvent.id;
      await event.save();

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: {
          event,
          googleEvent: {
            id: googleEvent.id,
            htmlLink: googleEvent.htmlLink,
          },
        },
      });

    } catch (googleError) {
      console.error('Google Calendar sync failed:', googleError);
      
      res.status(201).json({
        success: true,
        message: 'Event created successfully, but Google Calendar sync failed',
        data: {
          event,
        },
        warning: 'Google Calendar sync failed',
      });
    }

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message,
    });
  }
});

// Update event
router.put('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Update event in database
    Object.assign(event, req.body);
    await event.save();

    // Update in Google Calendar if synced
    if (event.googleEventId) {
      try {
        await googleCalendarService.updateEvent(req.user._id, event.googleEventId, req.body);
      } catch (googleError) {
        console.error('Google Calendar update failed:', googleError);
      }
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        event,
      },
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message,
    });
  }
});

// Delete event
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Delete from Google Calendar if synced
    if (event.googleEventId) {
      try {
        await googleCalendarService.deleteEvent(req.user._id, event.googleEventId);
      } catch (googleError) {
        console.error('Google Calendar delete failed:', googleError);
      }
    }

    // Delete from database
    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message,
    });
  }
});

// Sync with Google Calendar
router.post('/sync', protect, async (req, res) => {
  try {
    // Get events from Google Calendar
    const googleEvents = await googleCalendarService.getEvents(req.user._id);
    
    let syncedCount = 0;
    let updatedCount = 0;

    for (const googleEvent of googleEvents) {
      // Check if event already exists in our database
      let event = await Event.findOne({
        user: req.user._id,
        googleEventId: googleEvent.id,
      });

      if (event) {
        // Update existing event
        event.title = googleEvent.summary || event.title;
        event.description = googleEvent.description || event.description;
        event.startDateTime = googleEvent.start.dateTime || googleEvent.start.date;
        event.endDateTime = googleEvent.end.dateTime || googleEvent.end.date;
        event.location = googleEvent.location || event.location;
        await event.save();
        updatedCount++;
      } else {
        // Create new event
        event = await Event.create({
          user: req.user._id,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || '',
          startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
          endDateTime: googleEvent.end.dateTime || googleEvent.end.date,
          location: googleEvent.location || '',
          googleEventId: googleEvent.id,
          createdViaChat: false,
        });
        syncedCount++;
      }
    }

    res.json({
      success: true,
      message: `Sync completed: ${syncedCount} new events, ${updatedCount} updated events`,
      data: {
        syncedCount,
        updatedCount,
        totalGoogleEvents: googleEvents.length,
      },
    });

  } catch (error) {
    console.error('Sync events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync with Google Calendar',
      error: error.message,
    });
  }
});

module.exports = router;
