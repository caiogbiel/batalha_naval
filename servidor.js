const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let waitingPlayer = null;
let games = [];

const BOARD_SIZE = 10;

wss.on('connection', function connection(ws) {
  console.log('New connection');

  // Se não houver um jogador esperando, define este como o jogador aguardando
  if (!waitingPlayer) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ message: 'Você é o jogador 1. Aguarde o segundo jogador.' }));
  } else {
    // Se houver um jogador esperando, inicia um novo jogo
    startNewGame(waitingPlayer, ws);
    waitingPlayer = null;
  }

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);
    if (data.type === 'setup') {
      handleSetup(data.board, ws);
    } else if (data.type === 'attack') {
      handleAttack(data.x, data.y, ws);
    } else if (data.type === 'endSetup') {
      handleEndSetup(ws);
    }
  });

  ws.on('close', function close() {
    console.log('Connection closed');
    // Se o jogador que está esperando desconectar, redefine o jogador aguardando
    if (ws === waitingPlayer) {
      waitingPlayer = null;
    }
  });
});

function startNewGame(player1, player2) {
  const game = {
    players: [player1, player2],
    boards: [],
    currentPlayer: Math.floor(Math.random() * 2), // Escolhe aleatoriamente o primeiro jogador
    phase: 'setup' // Fase de configuração dos tabuleiros
  };

  // Inicializa os tabuleiros dos jogadores
  for (let i = 0; i < 2; i++) {
    game.boards[i] = generateEmptyBoard();
    game.players[i].send(JSON.stringify({ message: 'O jogo começou! Você é o jogador ' + (i + 1) }));
  }

  games.push(game);
}

function handleSetup(board, ws) {
  const game = getGameByPlayer(ws);
  if (game && game.phase === 'setup' && game.players.indexOf(ws) === game.currentPlayer) {
    const playerIndex = game.players.indexOf(ws);
    game.boards[playerIndex] = board;
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    game.players[opponentIndex].send(JSON.stringify({ message: 'Aguardando o oponente terminar a configuração.' }));
    switchPlayer(game);
  }
}

function handleEndSetup(ws) {
  const game = getGameByPlayer(ws);
  if (game && game.phase === 'setup' && game.players.indexOf(ws) === game.currentPlayer) {
    const opponentIndex = game.players.indexOf(ws) === 0 ? 1 : 0;
    game.players[opponentIndex].send(JSON.stringify({ message: 'O oponente terminou a configuração. Agora é sua vez.' }));
    game.phase = 'play';
  }
}

function handleAttack(x, y, ws) {
  const game = getGameByPlayer(ws);
  if (game && game.phase === 'play' && game.players.indexOf(ws) === game.currentPlayer) {
    const opponentIndex = game.players.indexOf(ws) === 0 ? 1 : 0;
    const opponentBoard = game.boards[opponentIndex];
    const result = opponentBoard[y][x] === 0 ? 'miss' : 'hit';
    game.players[opponentIndex].send(JSON.stringify({ message: 'Ataque recebido em (' + x + ', ' + y + '): ' + result }));
    game.currentPlayer = opponentIndex;
  }
}

function switchPlayer(game) {
  game.currentPlayer = game.currentPlayer === 0 ? 1 : 0;
}

function getGameByPlayer(player) {
  return games.find(game => game.players.includes(player));
}

function generateEmptyBoard() {
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(0);
    }
    board.push(row);
  }
  return board;
}
