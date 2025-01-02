// Calendar management functionality for HelpDesk

/**
 * Schedule a support meeting
 * @param {Object} data - Meeting data
 * @returns {Object} Created event
 */
function scheduleMeeting(data) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get calendar
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }
    
    // Parse date and time
    const startTime = new Date(`${data.date}T${data.time}`);
    const endTime = new Date(startTime.getTime() + (data.duration * 60000));
    
    // Create Google Meet link
    const conferenceData = {
      createRequest: {
        requestId: generateId('meet_'),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
    
    // Create event
    const event = calendar.createEvent(data.title, startTime, endTime, {
      description: formatEventDescription(data),
      location: 'Google Meet',
      guests: data.attendees?.join(','),
      conferenceData: conferenceData,
      sendInvites: true
    });
    
    // Log activity
    logActivity({
      type: 'meeting_scheduled',
      user: user.email,
      card_id: data.cardId,
      details: {
        event_id: event.getId(),
        start_time: startTime.toISOString(),
        duration: data.duration
      }
    });
    
    return {
      id: event.getId(),
      title: event.getTitle(),
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      meet_link: event.getHangoutLink()
    };
  } catch (error) {
    error('Error scheduling meeting', { error, data });
    throw error;
  }
}

/**
 * Format event description
 * @param {Object} data - Meeting data
 * @returns {string} Formatted description
 */
function formatEventDescription(data) {
  let description = '';
  
  if (data.cardId) {
    description += `Support Card: #${data.cardId}\n\n`;
  }
  
  if (data.description) {
    description += `${data.description}\n\n`;
  }
  
  description += `
Meeting Notes:
-------------
• Please join via Google Meet link above
• Have any relevant documentation ready
• Meeting will be recorded with your permission

Need to reschedule? Contact support@wrench.chat
`;
  
  return description;
}

/**
 * Get upcoming meetings
 * @param {Object} options - Query options
 * @returns {Array} Upcoming meetings
 */
function getUpcomingMeetings(options = {}) {
  try {
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    const calendar = CalendarApp.getCalendarById(calendarId);
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const events = calendar.getEvents(now, oneWeekFromNow);
    
    return events.map(event => ({
      id: event.getId(),
      title: event.getTitle(),
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString(),
      description: event.getDescription(),
      meet_link: event.getHangoutLink(),
      attendees: event.getGuestList().map(guest => ({
        email: guest.getEmail(),
        name: guest.getName(),
        status: guest.getGuestStatus()
      }))
    }));
  } catch (error) {
    error('Error getting upcoming meetings', { error });
    throw error;
  }
}

/**
 * Update a meeting
 * @param {string} eventId - Calendar event ID
 * @param {Object} updates - Update data
 * @returns {Object} Updated event
 */
function updateMeeting(eventId, updates) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar.getEventById(eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Update event properties
    if (updates.title) {
      event.setTitle(updates.title);
    }
    
    if (updates.description) {
      event.setDescription(formatEventDescription(updates));
    }
    
    if (updates.start || updates.duration) {
      const startTime = updates.start ? new Date(updates.start) : event.getStartTime();
      const duration = updates.duration || 
        (event.getEndTime().getTime() - event.getStartTime().getTime()) / 60000;
      const endTime = new Date(startTime.getTime() + (duration * 60000));
      
      event.setTime(startTime, endTime);
    }
    
    if (updates.attendees) {
      // Get current guests to avoid duplicate invites
      const currentGuests = event.getGuestList().map(guest => guest.getEmail());
      const newGuests = updates.attendees.filter(email => !currentGuests.includes(email));
      
      if (newGuests.length > 0) {
        event.addGuests(newGuests);
      }
    }
    
    // Log activity
    logActivity({
      type: 'meeting_updated',
      user: user.email,
      details: {
        event_id: eventId,
        updates: updates
      }
    });
    
    return {
      id: event.getId(),
      title: event.getTitle(),
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString(),
      meet_link: event.getHangoutLink()
    };
  } catch (error) {
    error('Error updating meeting', { error, eventId, updates });
    throw error;
  }
}

/**
 * Cancel a meeting
 * @param {string} eventId - Calendar event ID
 * @returns {boolean} Success status
 */
function cancelMeeting(eventId) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar.getEventById(eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Delete event
    event.deleteEvent();
    
    // Log activity
    logActivity({
      type: 'meeting_cancelled',
      user: user.email,
      details: {
        event_id: eventId
      }
    });
    
    return true;
  } catch (error) {
    error('Error cancelling meeting', { error, eventId });
    throw error;
  }
}

/**
 * Get available meeting slots
 * @param {Object} options - Query options
 * @returns {Array} Available time slots
 */
function getAvailableSlots(options = {}) {
  try {
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    const calendar = CalendarApp.getCalendarById(calendarId);
    
    const {
      date = new Date(),
      duration = 45,
      startHour = 9,
      endHour = 17,
      timezone = 'America/Los_Angeles'
    } = options;
    
    // Set up time bounds
    const startTime = new Date(date);
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, 0, 0, 0);
    
    // Get existing events
    const events = calendar.getEvents(startTime, endTime);
    const busySlots = events.map(event => ({
      start: event.getStartTime(),
      end: event.getEndTime()
    }));
    
    // Find available slots
    const slots = [];
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      // Check if slot overlaps with any busy slots
      const isAvailable = !busySlots.some(busy => 
        (currentTime >= busy.start && currentTime < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end)
      );
      
      if (isAvailable) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      
      // Move to next slot
      currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30-minute intervals
    }
    
    return slots;
  } catch (error) {
    error('Error getting available slots', { error, options });
    throw error;
  }
}

/**
 * Initialize calendar integration
 * @returns {boolean} Success status
 */
function initCalendar() {
  try {
    const calendarId = getSetting('integrations.google_calendar.default_calendar_id');
    
    // Verify calendar access
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found or not accessible');
    }
    
    // Set up calendar sharing if needed
    const sharingAccess = calendar.getSharesById(calendarId);
    if (!sharingAccess) {
      calendar.setShareSettings(
        'support@wrench.chat',
        CalendarApp.Access.OWNER
      );
    }
    
    return true;
  } catch (error) {
    error('Error initializing calendar', { error });
    return false;
  }
}
