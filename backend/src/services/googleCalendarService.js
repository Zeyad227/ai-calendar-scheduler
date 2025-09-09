const { google } = require('googleapis');
const User = require('../models/User');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass user ID to link the auth
    });
  }

  async handleCallback(code, userId) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Save tokens to user
      await User.findByIdAndUpdate(userId, {
        googleTokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
      });

      return tokens;
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  async getCalendarClient(userId) {
    const user = await User.findById(userId);
    if (!user.googleTokens) {
      throw new Error('User not authenticated with Google');
    }

    this.oauth2Client.setCredentials(user.googleTokens);

    // Check if token needs refresh
    if (Date.now() >= user.googleTokens.expiry_date) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await User.findByIdAndUpdate(userId, {
          googleTokens: credentials,
        });
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        throw new Error('Failed to refresh Google token');
      }
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async createEvent(userId, eventDetails) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const event = {
        summary: eventDetails.title,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.startDateTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventDetails.endDateTime,
          timeZone: 'UTC',
        },
        location: eventDetails.location,
        attendees: eventDetails.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'popup', minutes: 10 }, // 10 minutes
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all', // Send invites to attendees
      });

      return response.data;
    } catch (error) {
      console.error('Google Calendar create event error:', error);
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  async updateEvent(userId, googleEventId, eventDetails) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const event = {
        summary: eventDetails.title,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.startDateTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventDetails.endDateTime,
          timeZone: 'UTC',
        },
        location: eventDetails.location,
        attendees: eventDetails.attendees?.map(email => ({ email })),
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        resource: event,
        sendUpdates: 'all',
      });

      return response.data;
    } catch (error) {
      console.error('Google Calendar update event error:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  async deleteEvent(userId, googleEventId) {
    try {
      const calendar = await this.getCalendarClient(userId);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
        sendUpdates: 'all',
      });

      return true;
    } catch (error) {
      console.error('Google Calendar delete event error:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  async getEvents(userId, timeMin, timeMax) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax,
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google Calendar get events error:', error);
      throw new Error('Failed to fetch events from Google Calendar');
    }
  }

  async checkAvailability(userId, startDateTime, endDateTime) {
    try {
      const events = await this.getEvents(userId, startDateTime, endDateTime);
      
      const conflicts = events.filter(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        const requestStart = new Date(startDateTime);
        const requestEnd = new Date(endDateTime);

        // Check for overlap
        return (requestStart < eventEnd && requestEnd > eventStart);
      });

      return {
        available: conflicts.length === 0,
        conflicts: conflicts.map(event => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
        })),
      };
    } catch (error) {
      console.error('Availability check error:', error);
      return { available: true, conflicts: [] }; // Assume available if check fails
    }
  }
}

module.exports = new GoogleCalendarService();
