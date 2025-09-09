const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDateTime: {
    type: Date,
    required: [true, 'Start date/time is required'],
  },
  endDateTime: {
    type: Date,
    required: [true, 'End date/time is required'],
  },
  location: {
    type: String,
    trim: true,
  },
  attendees: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    name: String,
    responseStatus: {
      type: String,
      enum: ['needsAction', 'declined', 'tentative', 'accepted'],
      default: 'needsAction',
    },
  }],
  googleEventId: {
    type: String,
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['confirmed', 'tentative', 'cancelled'],
    default: 'confirmed',
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    interval: Number,
    endDate: Date,
    count: Number,
  },
  reminders: [{
    method: {
      type: String,
      enum: ['email', 'popup'],
      default: 'popup',
    },
    minutes: {
      type: Number,
      default: 10,
    },
  }],
  createdViaChat: {
    type: Boolean,
    default: false,
  },
  chatContext: {
    originalMessage: String,
    extractedInfo: Object,
    confidence: Number,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
eventSchema.index({ user: 1, startDateTime: 1 });
eventSchema.index({ googleEventId: 1 });

module.exports = mongoose.model('Event', eventSchema);
