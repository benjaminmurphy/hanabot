import { prisma } from "../lib/db";
import { Player, Turn } from "@prisma/client";
import { parseCard, allCards, cardToString, CardColor, printHand, handToString, Card } from "../lib/card";
import { getPlayerNames } from "../lib/names";
import { shuffle } from "lodash";
import { HintCard, getHintCard, getHintTypeFromString, hintToString, hintTypeToString } from "../lib/hints";
import { evaluate } from "./gpt";

type CurrentState = {
  players: Player[],
  turns: Turn[],
  playerHands: Card[][],
  turnDescriptions: string[][],
  playerHints: HintCard[][][],
  mistakes: number,
  boardState: Record<CardColor, number>,
  currentIndex: number,
  hints: number,
  isGameActive: boolean,
  currentPlayer: Player,
  currentPlayerIndex: number,
}

export class GameState {
  gameId: number;

  static async create(players: number) {
    const startingDeck = shuffle(allCards());

    const newGame = await prisma.game.create({
      data: {
        initialDeck: startingDeck.map(card => cardToString(card)),
      },
    });

    const names = getPlayerNames(players);

    for (let i = 0; i < players; i++) {
      await prisma.player.create({
        data: {
          gameId: newGame.id,
          initialHand: startingDeck.splice(0, 4).map(card => cardToString(card)),
          name: names[i],
        },
      });
    }

    return new GameState(newGame.id);
  }

  constructor(gameId: number) {
    this.gameId = gameId;
  }

  // The turn order is determined by the player ID. The first player is the one with minimum ID.
  async getCurrentPlayer(): Promise<Player> {
    const players = await prisma.player.findMany({
      where: {
        gameId: this.gameId,
      },
      orderBy: {
        id: "asc",
      },
      include: { turns: true }
    });

    const maxTurns = Math.max(...players.map((player: any) => player.turns.length));
    return players.find((player: any) => player.turns.length < maxTurns) ?? players[0];
  }

  async getNumberOfCardsSeen(): Promise<number> {
    const players = await prisma.player.findMany({
      where: {
        gameId: this.gameId,
      },
      include: {
        turns: {
          orderBy: {
            id: "asc",
          },
        }
      }
    });

    let cardsSeen = 4 * players.length;
    for (const player of players) {
      for (const turn of player.turns) {
        if (turn.discardIndex !== null) {
          cardsSeen++;
        } else if (turn.playIndex !== null) {
          cardsSeen++;
        }
      }
    }

    return cardsSeen;
  };

  async getCurrentGameState(): Promise<CurrentState> {
    const game = await prisma.game.findUnique({
      where: {
        id: this.gameId,
      },
    });

    const players = await prisma.player.findMany({
      where: {
        gameId: this.gameId,
      },
      orderBy: {
        id: "asc",
      },
    });

    const turns = await prisma.turn.findMany({
      where: {
        gameId: this.gameId,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!game || !players.length) {
      throw new Error(`Game ${this.gameId} not found`);
    }

    const pidx = (playerId: number): number => {
      const idx = players.findIndex((player: Player) => player.id === playerId)
      if (idx === -1) {
        throw new Error(`Player ${playerId} not found`);
      }
      return idx;
    }

    const currentPlayer = await this.getCurrentPlayer();

    const initialDeck = game?.initialDeck.map((card: string) => parseCard(card));
    let currentIndex = 4 * players.length;
    let mistakes = 0;
    let hints = 8;
    let boardState: Record<CardColor, number> = {
      'RED': 0,
      'BLUE': 0,
      'GREEN': 0,
      'YELLOW': 0,
      'WHITE': 0,
    }

    const playerHands = players.map((player: Player) => player.initialHand.map((card: string) => parseCard(card)));

    // Each player gets a different description of the game.
    const turnDescriptions: string[][] = [];
    for (let i = 0; i < players.length; i++) {
      turnDescriptions.push([]);
    }

    // For every card in a player's hand, an array of hints which do or don't apply to that card.
    const playerHints: HintCard[][][] = [];
    for (let pi = 0; pi < players.length; pi++) {
      playerHints.push([]);
      for (let ci = 0; ci < 4; ci++) {
        playerHints[pi].push([]);
      }
    }


    // TODO: If we run out of cards, gotta deal with that.
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const turnPlayer = players[pidx(turn.playerId)];

      if (turn.hintTargetId !== null) {
        if (hints > 0) {
          hints -= 1;
        } else {
          throw new Error('Out of hints!');
        }

        const hintedPlayer = players[pidx(turn.hintTargetId)];

        // TODO: Handle missing card indices.
        for (let ci = 0; ci < 4; ci++) {
          const card = playerHands[pidx(turn.hintTargetId)][ci];
          playerHints[pidx(turn.hintTargetId)][ci].push(getHintCard(turn.hintType!, card));
        }

        for (let i = 0; i < players.length; i++) {
          if (turn.playerId !== players[i].id && turn.hintTargetId !== players[i].id) {
            turnDescriptions[i].push(`${turnPlayer.name} hinted ${hintedPlayer.name} the cards which are ${hintTypeToString(turn.hintType!)}.`);
          } else if (turn.playerId !== players[i].id) {
            turnDescriptions[i].push(`${turnPlayer.name} hinted you the cards which are ${hintTypeToString(turn.hintType!)}.`);
          } else if (turn.hintTargetId !== players[i].id) {
            turnDescriptions[i].push(`You hinted ${hintedPlayer.name} the cards which are ${hintTypeToString(turn.hintType!)}.`);
          } else {
            throw new Error('This should never happen.');
          }
        }
      } else if (turn.discardIndex !== null) {
        hints += 1;

        const discardedCard = playerHands[pidx(turn.playerId)][turn.discardIndex];
        const drawnCard = initialDeck[currentIndex];
        currentIndex = currentIndex + 1;

        playerHands[pidx(turn.playerId)].splice(turn.discardIndex, 1);
        playerHands[pidx(turn.playerId)].unshift(drawnCard);

        playerHints[pidx(turn.playerId)].splice(turn.discardIndex, 1);
        playerHints[pidx(turn.playerId)].unshift([] as HintCard[]);

        // Add the descriptions.
        for (let i = 0; i < players.length; i++) {
          if (turn.playerId !== players[i].id) {
            turnDescriptions[i].push(`${turnPlayer.name} discarded ${cardToString(discardedCard)} and drew ${cardToString(drawnCard)}.`);
          } else {
            turnDescriptions[i].push(`You discarded ${cardToString(discardedCard)} and drew a card.`);
          }
        }
      } else if (turn.playIndex !== null) {
        const playedCard = playerHands[pidx(turn.playerId)][turn.playIndex];
        const drawnCard = initialDeck[currentIndex];
        currentIndex = currentIndex + 1;

        playerHands[pidx(turn.playerId)].splice(turn.playIndex, 1);
        playerHands[pidx(turn.playerId)].unshift(drawnCard);

        playerHints[pidx(turn.playerId)].splice(turn.playIndex, 1);
        playerHints[pidx(turn.playerId)].unshift([] as HintCard[]);

        // Next, see if it goes to the right place.
        let didMakeMistake = false;
        if (boardState[playedCard.color] === playedCard.number - 1) {
          boardState[playedCard.color] = playedCard.number;
        } else {
          didMakeMistake = true;
          mistakes++;
        }

        // TODO: Deal with game end.

        // Add the descriptions.
        for (let j = 0; j < players.length; j++) {
          const player = players[j]!;
          if (turn.playerId !== player.id) {
            if (didMakeMistake) {
              turnDescriptions[j].push(`${turnPlayer.name} played ${cardToString(playedCard)}, which did not match the needed card ${playedCard.color} ${boardState[playedCard.color] + 1}. There have now been ${mistakes} mistake(s). They drew ${cardToString(drawnCard)}.`);
            } else {
              turnDescriptions[j].push(`${turnPlayer.name} played ${cardToString(playedCard)}, which matched the needed card. They drew ${cardToString(drawnCard)}.`);
            }
          } else {
            if (didMakeMistake) {
              // TODO: The needed card stops at 5.
              turnDescriptions[j].push(`You played ${cardToString(playedCard)}, which did not match the needed card ${playedCard.color} ${boardState[playedCard.color] + 1}. There have now been ${mistakes} mistake(s). You drew a card.`);
            } else {
              turnDescriptions[j].push(`You played ${cardToString(playedCard)}, which matched the needed card. You drew a card.`);
            }
          }
        }

      } else {
        throw new Error(`Invalid turn ${turn.id}`);
      }
    }

    // Log the current game state.
    console.log(`\n\nAfter turn ${turns.length}:`);

    for (const player of players) {
      const playerHand = playerHands[pidx(player.id)];
      console.log(`${currentPlayer.id === player.id ? '> ' : '  '}(new) ${printHand(playerHand)} (old) (${player.name})`);

      if (turnDescriptions[pidx(player.id)].length > 0) {
        console.log(`    Sees: ${turnDescriptions[pidx(player.id)][turnDescriptions[pidx(player.id)].length - 1]}`);
      }

      for (let ci = 0; ci < 4; ci++) {
        const card = playerHand[ci];
        const hints = playerHints[pidx(player.id)][ci];
        console.log(`    ${cardToString(card)}: ${hints.map(hint => 'is ' + hintToString(hint)).join(', ')}`);
      }
    }

    return {
      players,
      turns,
      playerHands,
      turnDescriptions,
      playerHints,
      mistakes,
      boardState,
      currentIndex,
      currentPlayerIndex: pidx(currentPlayer.id),
      hints,
      isGameActive: mistakes < 3,
      currentPlayer,
    }
  }

  async evaluateNextTurn() {
    const {
      players,
      turns,
      hints,
      playerHands,
      turnDescriptions,
      playerHints,
      mistakes,
      boardState,
      currentIndex,
      isGameActive,
      currentPlayer,
      currentPlayerIndex,
    } = await this.getCurrentGameState();

    let prompt = `
You are playing Hanabi with ${players.length - 1} other players. They are: ${players.map((p: Player) => p.name).join(', ')}.
Your name is ${currentPlayer.name}. There have been ${mistakes} mistake(s) so far, and you have ${3 - mistakes} mistakes left.
You have ${hints} hint(s) left to give.

In Hanabi, players are fully aware of all other players' hands, but not their own. You can see the other players' hands below.
When a hint is given to a player, they are told all of the cards in their hand which match the hint. For example, if a player
has a hand of RED 1, YELLOW 3, GREEN 3, RED 2, and they are given a hint of RED, they will be told that the first and last cards
in their hand are RED. If they are given a hint of 3, they will be told that the second and third cards in their hand are 3s.

Absent other evidence, a player should assume that when they receive a hint, that hint indicates to play the leftmost card that
matches the hint. For example, if a player has a hand of RED 1, YELLOW 3, GREEN 3, RED 2, and they are given a hint of 3, they
should assume that they should play the second card in their hand, the YELLOW 3.

For example, to suggest that the next player should play their leftmost 1, you might respond: HINT <NAME> 1
To suggest that a player's last card is a five and should not be discard, you might respond: HINT <NAME> 5
To suggest that multiple blue cards in a player's hand can be played in order from left to right, you might respond: HINT <NAME> BLUE

The goal is to build each color of card in order, from 1 to 5. The only cards which can be played to the board currently are:
RED ${boardState.RED + 1}
YELLOW ${boardState.YELLOW + 1}
GREEN ${boardState.GREEN + 1}
BLUE ${boardState.BLUE + 1}
WHITE ${boardState.WHITE + 1}

If a player plays incorrectly, that triggers a mistake. If three mistakes are made, the game ends.

This game follows these conventions:
- If you believe you can play a card safely, prefer to do so.
- Every hint should cause one or more players to play a card. Always give hints which match at least one card in a player's hand.
- Every hint should provide new information that the players did not know.
- New cards are placed at the left of the hand.
- If you are going to discard a card, discard the rightmost card that has not been clued.

${turnDescriptions[currentPlayerIndex].length > 0 ? `
The following turns have been taken:
${turnDescriptions[currentPlayerIndex].join('\n')}
` : ''}
`;

    for (let i = 0; i < players.length; i++) {
      if (i === currentPlayerIndex) {
        prompt += `You have ${playerHands[i].length} cards in your hand. You know the following information about these cards:
${playerHints[i].map((hints: HintCard[], ci: number) => `Card ${ci + 1}: ${hints.map(hint => 'is ' + hintToString(hint)).join(', ')}`).join('\n')}
`
      } else {
        prompt += `${players[i].name} has ${playerHands[i].length} cards in their hand. These cards are: ${handToString(playerHands[i])}
${players[i].name} has received the following hints about cards in their hand:
${playerHints[i].map((hints: HintCard[], ci: number) => `${cardToString(playerHands[i][ci])}: ${hints.map(hint => 'is ' + hintToString(hint)).join(', ')}`).join('\n')}
`;
      }

      prompt += '\n';
    }

    prompt += `It is your turn. You may do one of the following actions by answering in the corresponding format as the only response:
PLAY <N>, where N is the index of the card you want to play, counting from 1 on the left.
DISCARD <N>, where N is the index of the card you want to discard, counting from 1 on the left.
HINT <PLAYER> <COLOR>, where PLAYER is the player's name to hint and COLOR is replaced with the color to hint, such as RED or BLUE. When you hint a color, that player learns all cards in their hand which are that color.
HINT <PLAYER> <NUMBER>, where PLAYER is the player's name to hint and NUMBER is replaced with the number to hint, such as 1 or 3. When you hint a number, that player learns all cards which are that color.
`;

    prompt = prompt.replaceAll(/^\s+/g, '');

    const response = await evaluate([
      {
        role: 'user',
        content: prompt,
      }
    ]);

    console.log(prompt);

    const action = response.data.choices[0].message?.content ?? '';
    console.log(action);

    const actionType = action.split(' ')[0];
    if (!actionType || !['PLAY', 'DISCARD', 'HINT'].includes(actionType.toUpperCase())) {
      throw new Error('failed to parse');
    }

    if (actionType.toUpperCase() === 'PLAY') {
      await prisma.turn.create({
        data: {
          gameId: this.gameId,
          playerId: currentPlayer.id,
          playIndex: parseInt(action.split(' ')[1]) - 1,
        }
      });
    } else if (actionType.toUpperCase() === 'DISCARD') {
      await prisma.turn.create({
        data: {
          gameId: this.gameId,
          playerId: currentPlayer.id,
          discardIndex: parseInt(action.split(' ')[1]) - 1,
        }
      });
    } else {
      const playerName = action.split(' ')[1].trim();
      const hintType = action.split(' ')[2].trim().toUpperCase();

      if (!playerName || !hintType) {
        throw new Error('failed to parse');
      }

      const player = players.find(p => p.name === playerName);
      if (!player) {
        throw new Error('failed to parse');
      }

      if (!['RED', 'YELLOW', 'GREEN', 'BLUE', 'WHITE', '1', '2', '3', '4', '5'].includes(hintType)) {
        throw new Error('failed to parse');
      }

      await prisma.turn.create({
        data: {
          gameId: this.gameId,
          playerId: currentPlayer.id,
          hintTargetId: player.id,
          hintType: getHintTypeFromString(hintType),
        }
      });
    }
  }
}