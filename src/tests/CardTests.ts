/**
 * Card UI tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG } from '../Config';

interface CardTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  testCard?: GoogleAppsScript.Card.Card;
  [key: string]: any;
}

const CardTests: CardTestSuite = {
  name: 'Card Tests',
  
  async setup() {
    // Set up test card
    const header = CardService.newCardHeader()
      .setTitle('Test Card')
      .setSubtitle('Test subtitle')
      .setImageUrl(CONFIG.UI.LOGO_URL);
      
    const section = CardService.newCardSection()
      .setHeader('Test Section')
      .addWidget(CardService.newTextParagraph().setText('Test content'));
      
    this.testCard = CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section)
      .build();
  },
  
  async testCardCreation() {
    if (!this.testCard) {
      throw new Error('Test card not initialized');
    }

    // Test card structure
    const json = this.testCard.printJson();
    const card = JSON.parse(json);
    
    // Verify header
    assert(card.header, 'Card should have header');
    assertEqual(card.header.title, 'Test Card', 'Title should match');
    assertEqual(card.header.subtitle, 'Test subtitle', 'Subtitle should match');
    assertEqual(card.header.imageUrl, CONFIG.UI.LOGO_URL, 'Logo URL should match');
    
    // Verify sections
    assert(Array.isArray(card.sections), 'Card should have sections array');
    assertEqual(card.sections.length, 1, 'Card should have one section');
    
    const section = card.sections[0];
    assertEqual(section.header, 'Test Section', 'Section header should match');
    assert(Array.isArray(section.widgets), 'Section should have widgets array');
    assertEqual(section.widgets.length, 1, 'Section should have one widget');
    
    const widget = section.widgets[0];
    assertEqual(widget.textParagraph.text, 'Test content', 'Widget content should match');
  },
  
  async testCardActions() {
    if (!this.testCard) {
      throw new Error('Test card not initialized');
    }

    // Create action
    const action = CardService.newAction()
      .setFunctionName('handleCardAction')
      .setParameters({ test: 'value' });
      
    // Create button with action
    const button = CardService.newTextButton()
      .setText('Test Button')
      .setOnClickAction(action);
      
    // Add button to card
    const section = CardService.newCardSection()
      .addWidget(button);
      
    const actionCard = CardService.newCardBuilder()
      .addSection(section)
      .build();
      
    // Verify action
    const json = actionCard.printJson();
    const card = JSON.parse(json);
    
    const buttonWidget = card.sections[0].widgets[0];
    assert(buttonWidget.textButton, 'Should be text button');
    assertEqual(buttonWidget.textButton.text, 'Test Button', 'Button text should match');
    
    const onClick = buttonWidget.textButton.onClick;
    assert(onClick.action, 'Button should have action');
    assertEqual(onClick.action.function, 'handleCardAction', 'Action function should match');
    assertEqual(onClick.action.parameters.test, 'value', 'Action parameters should match');
  },
  
  async testCardNavigation() {
    if (!this.testCard) {
      throw new Error('Test card not initialized');
    }

    // Create navigation
    const nav = CardService.newNavigation()
      .pushCard(this.testCard);
      
    const navigationAction = CardService.newAction()
      .setFunctionName('handleNavigation')
      .setParameters({ nav: nav.printJson() });
      
    const button = CardService.newTextButton()
      .setText('Navigate')
      .setOnClickAction(navigationAction);
      
    const navCard = CardService.newCardBuilder()
      .addSection(CardService.newCardSection().addWidget(button))
      .build();
      
    // Verify navigation
    const json = navCard.printJson();
    const card = JSON.parse(json);
    
    const buttonWidget = card.sections[0].widgets[0];
    const onClick = buttonWidget.textButton.onClick;
    assert(onClick.action.parameters.nav, 'Should have navigation parameter');
    
    const navJson = onClick.action.parameters.nav;
    const navigation = JSON.parse(navJson);
    assert(navigation.pushCard, 'Should be push navigation');
    assertEqual(navigation.pushCard.header.title, 'Test Card', 'Navigation target should match');
  },
  
  async testCardUpdates() {
    if (!this.testCard) {
      throw new Error('Test card not initialized');
    }

    // Create update action
    const action = CardService.newAction()
      .setFunctionName('updateCard');
      
    const button = CardService.newTextButton()
      .setText('Update')
      .setOnClickAction(action);
      
    const updateCard = CardService.newCardBuilder()
      .addSection(CardService.newCardSection().addWidget(button))
      .build();
      
    // Create navigation with update
    const nav = CardService.newNavigation()
      .updateCard(updateCard);
      
    // Verify update
    const json = nav.printJson();
    const navigation = JSON.parse(json);
    
    assert(navigation.updateCard, 'Should be update navigation');
    const updatedCard = navigation.updateCard;
    assert(updatedCard.sections, 'Updated card should have sections');
    
    const buttonWidget = updatedCard.sections[0].widgets[0];
    assertEqual(buttonWidget.textButton.text, 'Update', 'Update button should match');
    assertEqual(buttonWidget.textButton.onClick.action.function, 'updateCard', 'Update function should match');
  },
  
  async testCardSuggestions() {
    if (!this.testCard) {
      throw new Error('Test card not initialized');
    }

    // Create suggestions
    const suggestions = CardService.newSuggestions()
      .addSuggestion('Test suggestion 1')
      .addSuggestion('Test suggestion 2');
      
    const textInput = CardService.newTextInput()
      .setTitle('Test Input')
      .setSuggestions(suggestions);
      
    const suggestCard = CardService.newCardBuilder()
      .addSection(CardService.newCardSection().addWidget(textInput))
      .build();
      
    // Verify suggestions
    const json = suggestCard.printJson();
    const card = JSON.parse(json);
    
    const inputWidget = card.sections[0].widgets[0];
    assert(inputWidget.textInput, 'Should be text input');
    assert(inputWidget.textInput.suggestions, 'Input should have suggestions');
    
    const suggestionItems = inputWidget.textInput.suggestions.items;
    assert(Array.isArray(suggestionItems), 'Should have suggestions array');
    assertEqual(suggestionItems.length, 2, 'Should have two suggestions');
    assertEqual(suggestionItems[0].text, 'Test suggestion 1', 'First suggestion should match');
    assertEqual(suggestionItems[1].text, 'Test suggestion 2', 'Second suggestion should match');
  }
};

export default CardTests;
