/**
 * Bot Notifier - lightweight event bus for lobby updates
 */
import { EventEmitter } from 'events';

class BotNotifier extends EventEmitter {
  constructor() {
    super();
    this._lobbies = new Map(); // roundId -> { chatId, messageId }
  }

  setLobby(roundId, chatId, messageId) {
    this._lobbies.set(String(roundId), { chatId, messageId });
  }

  getLobby(roundId) {
    return this._lobbies.get(String(roundId));
  }

  clearLobby(roundId) {
    this._lobbies.delete(String(roundId));
  }
}

export const botNotifier = new BotNotifier();
