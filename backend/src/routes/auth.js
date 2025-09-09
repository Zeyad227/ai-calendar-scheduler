const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const googleCalendarService = require('../services/googleCalendarService');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, timezone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      timezone: timezone || 'UTC',
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: error.message,
    });
  }
});

// Google OAuth - Get auth URL
router.get('/google', protect, async (req, res) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl(req.user._id);
    
    res.json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Google auth URL',
      error: error.message,
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // User ID passed in state

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing authorization code or user ID',
      });
    }

    await googleCalendarService.handleCallback(code, userId);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?google_auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?google_auth=error`);
  }
});

// Update user preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { timezone, workingHours, workingDays, defaultMeetingDuration } = req.body;

    const updateData = {};
    if (timezone) updateData.timezone = timezone;
    if (workingHours) updateData['preferences.workingHours'] = workingHours;
    if (workingDays) updateData['preferences.workingDays'] = workingDays;
    if (defaultMeetingDuration) updateData['preferences.defaultMeetingDuration'] = defaultMeetingDuration;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message,
    });
  }
});

module.exports = router;
