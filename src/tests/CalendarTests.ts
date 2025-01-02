/**
 * Calendar integration tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG } from '../Config';

interface CalendarTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  testCalendarId?: string;
  testEventId?: string;
  testEvent?: GoogleAppsScript.CalendarEvent;
  [key: string]: any;
}

const CalendarTests: CalendarTestSuite = {
  name: 'Calendar Tests',
  
  async setup() {
    // Set up test calendar
    this.testCalendarId = 'test_calendar';
    this.testEvent = {
      summary: 'Test Meeting',
      description: 'Test meeting description',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.MEETING_DEFAULTS.TIMEZONE
      },
      end: {
        dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        timeZone: CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.MEETING_DEFAULTS.TIMEZONE
      },
      attendees: [
        { email: 'test@example.com' }
      ]
    };
  },
  
  async teardown() {
    // Clean up test calendar
    if (this.testCalendarId && this.testEventId) {
      try {
        await Calendar.Events.remove(this.testCalendarId, this.testEventId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  },
  
  async testCreateEvent() {
    if (!this.testCalendarId || !this.testEvent) {
      throw new Error('Test calendar or event not initialized');
    }

    const event = await Calendar.Events.insert(
      this.testCalendarId,
      this.testEvent
    );
    
    this.testEventId = event.id;
    
    assert(event.id !== undefined, 'Event should have an ID');
    assert(event.summary === this.testEvent.summary, 'Event summary should match');
    assert(event.description === this.testEvent.description, 'Event description should match');
    assert(
      event.start?.timeZone === CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.MEETING_DEFAULTS.TIMEZONE,
      'Event timezone should match'
    );
  },
  
  async testUpdateEvent() {
    if (!this.testCalendarId || !this.testEventId) {
      throw new Error('Test calendar or event ID not initialized');
    }

    const updatedSummary = 'Updated Test Meeting';
    const event = await Calendar.Events.patch(
      this.testCalendarId,
      this.testEventId,
      { summary: updatedSummary }
    );
    
    assert(event.summary === updatedSummary, 'Event summary should be updated');
  },
  
  async testGetEvent() {
    if (!this.testCalendarId || !this.testEventId) {
      throw new Error('Test calendar or event ID not initialized');
    }

    const event = await Calendar.Events.get(
      this.testCalendarId,
      this.testEventId
    );
    
    assert(event !== null, 'Event should exist');
    assert(event.id === this.testEventId, 'Event ID should match');
  },
  
  async testListEvents() {
    if (!this.testCalendarId) {
      throw new Error('Test calendar not initialized');
    }

    const events = await Calendar.Events.list(this.testCalendarId, {
      timeMin: new Date().toISOString(),
      maxResults: 10
    });
    
    assert(Array.isArray(events.items), 'Should return array of events');
    assert((events.items?.length ?? 0) > 0, 'Should have at least one event');
  },
  
  async testDeleteEvent() {
    if (!this.testCalendarId || !this.testEventId) {
      throw new Error('Test calendar or event ID not initialized');
    }

    await Calendar.Events.remove(
      this.testCalendarId,
      this.testEventId
    );
    
    try {
      await Calendar.Events.get(
        this.testCalendarId,
        this.testEventId
      );
      assert(false, 'Event should be deleted');
    } catch (error) {
      if (error instanceof Error) {
        assert(error.message.includes('404'), 'Should throw 404 error');
      } else {
        throw error;
      }
    }
  }
};

export default CalendarTests;
