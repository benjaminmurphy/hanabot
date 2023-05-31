import { prisma } from "../lib/db";
import { GameState } from "../services/game";

const play = async () => {
  const game = await GameState.create(4);
  // const { players } = await game.getCurrentGameState();

  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();
  console.log('\n\n\n');
  await game.evaluateNextTurn();

  // await prisma.turn.create({
  //   data: {
  //     playerId: players[0].id,
  //     gameId: game.gameId,

  //     hintTargetId: players[1].id,
  //     hintType: 'COLOR_BLUE',
  //   },
  // });

  // await game.getCurrentGameState();

  // await prisma.turn.create({
  //   data: {
  //     playerId: players[1].id,
  //     gameId: game.gameId,

  //     discardIndex: 0,
  //   }
  // });

  // await game.getCurrentGameState();

  // await prisma.turn.create({
  //   data: {
  //     playerId: players[2].id,
  //     gameId: game.gameId,

  //     discardIndex: 3,
  //   }
  // });

  // await game.getCurrentGameState();

  // await prisma.turn.create({
  //   data: {
  //     playerId: players[3].id,
  //     gameId: game.gameId,

  //     playIndex: 1,
  //   }
  // });

  // await game.getCurrentGameState();
}

play();