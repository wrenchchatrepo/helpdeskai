// Google Workspace Add-on handlers for HelpDesk

/**
 * Handle Gmail homepage open
 * @param {Object} e - Event object
 * @returns {Card} Add-on card
 */
function handleGmailHomePageOpen(e) {
  const builder = CardService.newCardBuilder();
  
  // Add header
  builder.setHeader(CardService.newCardHeader()
    .setTitle('HelpDesk')
    .setImageUrl('https://www.wrench.chat/logo.png')
  );
  
  // Add quick actions section
  const quickActionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');
  
  // Create card button
  const createCardAction = CardService.newAction()
    .setFunctionName('handleCreateCardFromGmail');
  
  quickActionsSection.addWidget(CardService.newTextButton()
    .setText('Create Support Card')
    .setOnClickAction(createCardAction)
  );
  
  // View cards button
  const viewCardsAction = CardService.newAction()
    .setFunctionName('handleViewCardsFromGmail');
  
  quickActionsSection.addWidget(CardService.newTextButton()
    .setText('View Cards')
    .setOnClickAction(viewCardsAction)
  );
  
  builder.addSection(quickActionsSection);
  
  // Add recent cards section
  const recentCardsSection = CardService.newCardSection()
    .setHeader('Recent Cards');
  
  const cards = getCards({ limit: 5 });
  
  cards.forEach(card => {
    const cardWidget = CardService.newKeyValue()
      .setTopLabel(card.title)
      .setContent(card.status)
      .setButton(CardService.newTextButton()
        .setText('View')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleViewCardDetails')
          .setParameters({ cardId: card.id })
        )
      );
    
    recentCardsSection.addWidget(cardWidget);
  });
  
  builder.addSection(recentCardsSection);
  
  return builder.build();
}

/**
 * Handle Calendar homepage open
 * @param {Object} e - Event object
 * @returns {Card} Add-on card
 */
function handleCalendarHomePageOpen(e) {
  const builder = CardService.newCardBuilder();
  
  // Add header
  builder.setHeader(CardService.newCardHeader()
    .setTitle('HelpDesk')
    .setImageUrl('https://www.wrench.chat/logo.png')
  );
  
  // Add upcoming meetings section
  const upcomingMeetingsSection = CardService.newCardSection()
    .setHeader('Upcoming Support Meetings');
  
  const meetings = getUpcomingMeetings();
  
  meetings.forEach(meeting => {
    const meetingWidget = CardService.newKeyValue()
      .setTopLabel(meeting.title)
      .setContent(new Date(meeting.start).toLocaleString())
      .setButton(CardService.newTextButton()
        .setText('Join')
        .setOpenLink(CardService.newOpenLink()
          .setUrl(meeting.meet_link)
        )
      );
    
    upcomingMeetingsSection.addWidget(meetingWidget);
  });
  
  builder.addSection(upcomingMeetingsSection);
  
  // Add schedule meeting section
  const scheduleMeetingSection = CardService.newCardSection()
    .setHeader('Schedule Meeting');
  
  const scheduleAction = CardService.newAction()
    .setFunctionName('handleScheduleMeeting');
  
  scheduleMeetingSection.addWidget(CardService.newTextButton()
    .setText('Schedule Support Meeting')
    .setOnClickAction(scheduleAction)
  );
  
  builder.addSection(scheduleMeetingSection);
  
  return builder.build();
}

/**
 * Handle Sheets add-on open
 * @param {Object} e - Event object
 * @returns {Card} Add-on card
 */
function handleSheetsHomePageOpen(e) {
  const builder = CardService.newCardBuilder();
  
  // Add header
  builder.setHeader(CardService.newCardHeader()
    .setTitle('HelpDesk')
    .setImageUrl('https://www.wrench.chat/logo.png')
  );
  
  // Add export section
  const exportSection = CardService.newCardSection()
    .setHeader('Export Data');
  
  // Export to sheet button
  const exportAction = CardService.newAction()
    .setFunctionName('handleExportToSheet');
  
  exportSection.addWidget(CardService.newTextButton()
    .setText('Export Cards to Sheet')
    .setOnClickAction(exportAction)
  );
  
  builder.addSection(exportSection);
  
  return builder.build();
}

/**
 * Handle creating card from Gmail
 * @param {Object} e - Event object
 * @returns {ActionResponse} Action response
 */
function handleCreateCardFromGmail(e) {
  const messageId = e.messageMetadata.messageId;
  const message = GmailApp.getMessageById(messageId);
  
  const card = createCard({
    title: message.getSubject(),
    content: message.getPlainBody(),
    source: 'gmail',
    metadata: {
      email: message.getFrom(),
      thread_id: message.getThread().getId()
    },
    attachments: getMessageAttachments(message)
  });
  
  const notification = CardService.newNotification()
    .setText('Support card created successfully');
  
  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}

/**
 * Handle viewing cards from Gmail
 * @param {Object} e - Event object
 * @returns {ActionResponse} Action response
 */
function handleViewCardsFromGmail(e) {
  return CardService.newActionResponseBuilder()
    .setOpenLink(CardService.newOpenLink()
      .setUrl(`${CONFIG.APP_URL}?page=cards`)
    )
    .build();
}

/**
 * Handle viewing card details
 * @param {Object} e - Event object
 * @returns {Card} Card details card
 */
function handleViewCardDetails(e) {
  const cardId = e.parameters.cardId;
  const card = getCard(cardId);
  
  if (!card) {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Card Not Found'))
      .build();
  }
  
  const builder = CardService.newCardBuilder();
  
  // Add header
  builder.setHeader(CardService.newCardHeader()
    .setTitle(card.title)
    .setSubtitle(`Status: ${card.status}`)
  );
  
  // Add details section
  const detailsSection = CardService.newCardSection();
  
  detailsSection.addWidget(CardService.newKeyValue()
    .setTopLabel('Created By')
    .setContent(card.created_by)
  );
  
  detailsSection.addWidget(CardService.newKeyValue()
    .setTopLabel('Created At')
    .setContent(formatDate(card.created_at))
  );
  
  if (card.assigned_to) {
    detailsSection.addWidget(CardService.newKeyValue()
      .setTopLabel('Assigned To')
      .setContent(card.assigned_to)
    );
  }
  
  builder.addSection(detailsSection);
  
  // Add messages section
  const messagesSection = CardService.newCardSection()
    .setHeader('Messages');
  
  const messages = getMessages(cardId);
  
  messages.forEach(message => {
    messagesSection.addWidget(CardService.newKeyValue()
      .setTopLabel(`${message.created_by} - ${formatDate(message.created_at)}`)
      .setContent(message.content)
    );
  });
  
  builder.addSection(messagesSection);
  
  return builder.build();
}

/**
 * Handle scheduling meeting
 * @param {Object} e - Event object
 * @returns {Card} Meeting form card
 */
function handleScheduleMeeting(e) {
  const builder = CardService.newCardBuilder();
  
  // Add header
  builder.setHeader(CardService.newCardHeader()
    .setTitle('Schedule Support Meeting')
  );
  
  // Add form section
  const formSection = CardService.newCardSection();
  
  // Title input
  formSection.addWidget(CardService.newTextInput()
    .setFieldName('title')
    .setTitle('Meeting Title')
    .setRequired(true)
  );
  
  // Date input
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  formSection.addWidget(CardService.newDatePicker()
    .setFieldName('date')
    .setTitle('Date')
    .setValueInMsSinceEpoch(tomorrow.getTime())
  );
  
  // Time input
  formSection.addWidget(CardService.newTimeInput()
    .setFieldName('time')
    .setTitle('Time')
    .setHours(10)
    .setMinutes(0)
  );
  
  // Duration input
  formSection.addWidget(CardService.newSelectionInput()
    .setFieldName('duration')
    .setTitle('Duration')
    .setType(CardService.SelectionInputType.DROPDOWN)
    .addItem('30 minutes', '30', false)
    .addItem('45 minutes', '45', true)
    .addItem('1 hour', '60', false)
  );
  
  // Submit button
  const submitAction = CardService.newAction()
    .setFunctionName('handleSubmitMeeting')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);
  
  formSection.addWidget(CardService.newTextButton()
    .setText('Schedule Meeting')
    .setOnClickAction(submitAction)
  );
  
  builder.addSection(formSection);
  
  return builder.build();
}

/**
 * Handle meeting form submission
 * @param {Object} e - Event object
 * @returns {ActionResponse} Action response
 */
function handleSubmitMeeting(e) {
  const formInputs = e.formInputs;
  
  const meeting = scheduleMeeting({
    title: formInputs.title,
    date: new Date(formInputs.date).toISOString().split('T')[0],
    time: formInputs.time,
    duration: parseInt(formInputs.duration)
  });
  
  const notification = CardService.newNotification()
    .setText('Meeting scheduled successfully');
  
  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}

/**
 * Handle exporting to sheet
 * @param {Object} e - Event object
 * @returns {ActionResponse} Action response
 */
function handleExportToSheet(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  
  // Get all cards
  const cards = getCards();
  
  // Set headers
  sheet.getRange(1, 1, 1, 7).setValues([[
    'ID', 'Title', 'Status', 'Created By', 'Created At', 'Updated At', 'Labels'
  ]]);
  
  // Set data
  const data = cards.map(card => [
    card.id,
    card.title,
    card.status,
    card.created_by,
    formatDate(card.created_at),
    formatDate(card.updated_at),
    card.labels.join(', ')
  ]);
  
  sheet.getRange(2, 1, data.length, 7).setValues(data);
  
  const notification = CardService.newNotification()
    .setText('Data exported successfully');
  
  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}
