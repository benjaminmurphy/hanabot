import { HintType } from "@prisma/client";
import { Card } from "./card";

export type HintCard = {
  hint: HintType;
  negated: boolean;
}

export const hintMatchesCard = (hint: HintType, card: Card): boolean => {
  switch (hint) {
    case HintType.COLOR_BLUE:
      return card.color === 'BLUE';
    case HintType.COLOR_GREEN:
      return card.color === 'GREEN';
    case HintType.COLOR_RED:
      return card.color === 'RED';
    case HintType.COLOR_WHITE:
      return card.color === 'WHITE';
    case HintType.COLOR_YELLOW:
      return card.color === 'YELLOW';
    case HintType.NUMBER_ONE:
      return card.number === 1;
    case HintType.NUMBER_TWO:
      return card.number === 2;
    case HintType.NUMBER_THREE:
      return card.number === 3;
    case HintType.NUMBER_FOUR:
      return card.number === 4;
    case HintType.NUMBER_FIVE:
      return card.number === 5;
  }
}

export const getHintCard = (hint: HintType, card: Card): HintCard => {
  return {
    hint,
    negated: !hintMatchesCard(hint, card),
  }
}

export const hintToString = (hint: HintCard): string => {
  switch (hint.hint) {
    case HintType.COLOR_BLUE:
      return hint.negated ? 'not blue' : 'blue';
    case HintType.COLOR_GREEN:
      return hint.negated ? 'not green' : 'green';
    case HintType.COLOR_RED:
      return hint.negated ? 'not red' : 'red';
    case HintType.COLOR_WHITE:
      return hint.negated ? 'not white' : 'white';
    case HintType.COLOR_YELLOW:
      return hint.negated ? 'not yellow' : 'yellow';
    case HintType.NUMBER_ONE:
      return hint.negated ? 'not one' : 'one';
    case HintType.NUMBER_TWO:
      return hint.negated ? 'not two' : 'two';
    case HintType.NUMBER_THREE:
      return hint.negated ? 'not three' : 'three';
    case HintType.NUMBER_FOUR:
      return hint.negated ? 'not four' : 'four';
    case HintType.NUMBER_FIVE:
      return hint.negated ? 'not five' : 'five';
  }
}

export const hintTypeToString = (hint: HintType): string => {
  switch (hint) {
    case HintType.COLOR_BLUE:
      return 'blue';
    case HintType.COLOR_GREEN:
      return 'green';
    case HintType.COLOR_RED:
      return 'red';
    case HintType.COLOR_WHITE:
      return 'white';
    case HintType.COLOR_YELLOW:
      return 'yellow';
    case HintType.NUMBER_ONE:
      return 'one';
    case HintType.NUMBER_TWO:
      return 'two';
    case HintType.NUMBER_THREE:
      return 'three';
    case HintType.NUMBER_FOUR:
      return 'four';
    case HintType.NUMBER_FIVE:
      return 'five';
  }
}

export const getHintTypeFromString = (hint: string): HintType => {
  switch (hint) {
    case 'BLUE':
      return HintType.COLOR_BLUE;
    case 'GREEN':
      return HintType.COLOR_GREEN;
    case 'RED':
      return HintType.COLOR_RED;
    case 'WHITE':
      return HintType.COLOR_WHITE;
    case 'YELLOW':
      return HintType.COLOR_YELLOW;
    case '1':
      return HintType.NUMBER_ONE;
    case '2':
      return HintType.NUMBER_TWO;
    case '3':
      return HintType.NUMBER_THREE;
    case '4':
      return HintType.NUMBER_FOUR;
    case '5':
      return HintType.NUMBER_FIVE;
  }

  throw new Error(`Invalid hint type ${hint}`);
}