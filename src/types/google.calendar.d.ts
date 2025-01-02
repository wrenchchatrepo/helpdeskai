declare namespace GoogleAppsScript {
  interface Calendar {
    Events: {
      insert(calendarId: string, event: CalendarEvent): Promise<CalendarEvent>;
      patch(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
      get(calendarId: string, eventId: string): Promise<CalendarEvent>;
      list(calendarId: string, options: CalendarListOptions): Promise<CalendarEventList>;
      remove(calendarId: string, eventId: string): Promise<void>;
    };
  }

  interface CalendarEvent {
    id?: string;
    summary?: string;
    description?: string;
    start?: {
      dateTime: string;
      timeZone: string;
    };
    end?: {
      dateTime: string;
      timeZone: string;
    };
    attendees?: Array<{
      email: string;
      responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    }>;
  }

  interface CalendarListOptions {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    orderBy?: 'startTime' | 'updated';
    singleEvents?: boolean;
    q?: string;
  }

  interface CalendarEventList {
    items?: CalendarEvent[];
    nextPageToken?: string;
  }
}

declare const Calendar: GoogleAppsScript.Calendar;
