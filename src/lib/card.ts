import chalk from "chalk";

export const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'WHITE'] as const;
export const numbers = [1, 2, 3, 4, 5] as const;
export const repetitions: Record<CardNumber, number> = {
  1: 3,
  2: 2,
  3: 2,
  4: 2,
  5: 1,
}

export type CardColor = typeof colors[number];
export type CardNumber = typeof numbers[number];

export type Card = {
  color: CardColor;
  number: CardNumber;
};

export const allCards = (): Card[] => {
  const cards: Card[] = [];

  for (const color of colors) {
    for (const number of numbers) {
      for (let i = 0; i < repetitions[number]; i++) {
        cards.push({ color, number });
      }
    }
  }

  return cards;
}

export const parseCard = (card: string): Card => {
  const [color, number] = card.split(' ');
  if (!colors.includes(color as CardColor)) {
    throw new Error(`Invalid color ${color}`);
  }
  if (!numbers.includes(parseInt(number) as CardNumber)) {
    throw new Error(`Invalid number ${number}`);
  }

  return {
    color: color as CardColor,
    number: parseInt(number) as CardNumber,
  };
}

export const cardToString = (card: Card): string => {
  return `${card.color} ${card.number}`;
}

export const handToString = (hand: Card[]): string => {
  return hand.map(cardToString).join(', ');
}

export const printCard = (card: Card): string => {
  switch (card.color) {
    case 'RED':
      return chalk.red(card.number.toString());
    case 'BLUE':
      return chalk.blue(card.number.toString());
    case 'GREEN':
      return chalk.green(card.number.toString());
    case 'YELLOW':
      return chalk.yellow(card.number.toString());
    case 'WHITE':
      return chalk.white(card.number.toString());
  }
}

export const printHand = (hand: Card[]): string => {
  return hand.map(printCard).join(' ');
}