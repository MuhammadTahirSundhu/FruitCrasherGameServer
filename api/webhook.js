const fetch = require('node-fetch');
const { Telegraf } = require('telegraf');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAME_URL = process.env.GAME_URL; // Set this in Vercel's environment variables
const GAME_SHORT_NAME = 'FruitCatcher'; // Ensure this matches the short name set up in BotFather

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function sendMessage(chatId, text) {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
    });

    if (!response.ok) {
        console.error('Failed to send message:', response.statusText);
    }
}

async function sendGame(chatId) {
    const response = await fetch(`${TELEGRAM_API_URL}/sendGame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            game_short_name: GAME_SHORT_NAME,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Play Fruit Catcher', callback_game: {} }],
                    [{ text: 'Help', callback_data: 'help' }]
                ]
            }
        })
    });

    if (!response.ok) {
        console.error('Failed to send game:', response.statusText);
    }
}

async function answerInlineQuery(queryId) {
    const response = await fetch(`${TELEGRAM_API_URL}/answerInlineQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            inline_query_id: queryId,
            results: [
                {
                    type: 'game',
                    id: 'unique_game_id',
                    game_short_name: GAME_SHORT_NAME
                }
            ]
        })
    });

    if (!response.ok) {
        console.error('Failed to answer inline query:', response.statusText);
    }
}

module.exports = async (req, res) => {
    const { message, inline_query, callback_query } = req.body;

    try {
        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;

            if (text === '/start') {
                await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            } else if (text === '/play') {
                await sendGame(chatId);
            } else {
                await sendMessage(chatId, 'Unknown command. Type /start to begin.');
            }
        } else if (inline_query) {
            const queryId = inline_query.id;
            await answerInlineQuery(queryId);
        } else if (callback_query) {
            const chatId = callback_query.message.chat.id;
            const data = callback_query.data;

            if (data === 'play_fruit_catcher') {
                await sendGame(chatId);
            } else if (data === 'help') {
                await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            }
        }
    } catch (error) {
        console.error('Error processing request:', error);
    }

    res.status(200).end();
};
