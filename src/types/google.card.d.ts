declare namespace GoogleAppsScript {
  namespace Card {
    interface Card {
      printJson(): string;
    }

    interface CardHeader {
      setTitle(title: string): CardHeader;
      setSubtitle(subtitle: string): CardHeader;
      setImageUrl(url: string): CardHeader;
      setImageStyle(style: ImageStyle): CardHeader;
    }

    interface CardSection {
      setHeader(header: string): CardSection;
      addWidget(widget: Widget): CardSection;
      setCollapsible(collapsible: boolean): CardSection;
      setNumUncollapsibleWidgets(number: number): CardSection;
    }

    interface CardBuilder {
      setHeader(header: CardHeader): CardBuilder;
      addSection(section: CardSection): CardBuilder;
      build(): Card;
    }

    interface Action {
      setFunctionName(functionName: string): Action;
      setParameters(parameters: { [key: string]: string }): Action;
      setLoadIndicator(indicator: LoadIndicator): Action;
    }

    interface TextButton {
      setText(text: string): TextButton;
      setOnClickAction(action: Action): TextButton;
      setTextButtonStyle(style: TextButtonStyle): TextButton;
      setDisabled(disabled: boolean): TextButton;
    }

    interface TextInput {
      setTitle(title: string): TextInput;
      setValue(value: string): TextInput;
      setHint(hint: string): TextInput;
      setSuggestions(suggestions: Suggestions): TextInput;
      setOnChangeAction(action: Action): TextInput;
    }

    interface TextParagraph {
      setText(text: string): TextParagraph;
    }

    interface Navigation {
      pushCard(card: Card): Navigation;
      updateCard(card: Card): Navigation;
      popCard(): Navigation;
      popToRoot(): Navigation;
      printJson(): string;
    }

    interface Suggestions {
      addSuggestion(suggestion: string): Suggestions;
      addSuggestions(suggestions: string[]): Suggestions;
    }

    type Widget = TextButton | TextInput | TextParagraph;
    type ImageStyle = 'SQUARE' | 'CIRCLE';
    type TextButtonStyle = 'TEXT' | 'FILLED' | 'OUTLINE';
    type LoadIndicator = 'SPINNER' | 'NONE';
  }

  interface CardService {
    newCardBuilder(): Card.CardBuilder;
    newCardHeader(): Card.CardHeader;
    newCardSection(): Card.CardSection;
    newTextButton(): Card.TextButton;
    newTextInput(): Card.TextInput;
    newTextParagraph(): Card.TextParagraph;
    newAction(): Card.Action;
    newNavigation(): Card.Navigation;
    newSuggestions(): Card.Suggestions;
  }
}

declare const CardService: GoogleAppsScript.CardService;
