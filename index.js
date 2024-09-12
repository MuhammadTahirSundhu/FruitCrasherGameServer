const express = require('express');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

const app = express();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7286576213:AAFGoW-q__f4SYLSCnwk4e0CHJ0LP5QlFIs';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const Game1_URL = process.env.Game1_URL || "https://fruit-catchers.vercel.app/";
const Game2_URL = process.env.Game2_URL || "https://endless-runner-rust.vercel.app/";
const Game3_URL = process.env.Game3_URL || "https://card-matching-eight.vercel.app/";
const GAME1_SHORT_NAME = 'FruitCatcher';
const GAME2_SHORT_NAME = 'EndlessRunner';
const GAME3_SHORT_NAME = 'CardMatcher';
const VERCEL_URL = process.env.VERCEL_URL || 'https://fruit-crasher-game-server-fmyq44i45.vercel.app/';

app.use(bodyParser.json());

// Basic route for server status
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Webhook for Telegram
app.post('/webhook', async (req, res) => {
    console.log('Received request:', req.body);
    const { message, inline_query, callback_query } = req.body;

    try {
        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;

            if (text === '/start') {
                await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            } else if (text === '/play') {
                await sendGame(chatId, GAME1_SHORT_NAME); // Default to Game1
            } else {
                await sendMessage(chatId, 'Unknown command. Type /start to begin.');
            }
        } else if (inline_query) {
            const queryId = inline_query.id;
            await answerInlineQuery(queryId, GAME1_SHORT_NAME); // Default to Game1
        } else if (callback_query) {
            const chatId = callback_query.message.chat.id;
            const data = callback_query.data;

            switch (data) {
                case 'play_fruit_catcher':
                    await sendGame(chatId, GAME1_SHORT_NAME);
                    break;
                case 'play_endless_runner':
                    await sendGame(chatId, GAME2_SHORT_NAME);
                    break;
                case 'play_card_matcher':
                    await sendGame(chatId, GAME3_SHORT_NAME);
                    break;
                case 'help':
                    await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
                    break;
                default:
                    console.log('Unknown callback query:', data);
                    break;
            }
        }
    } catch (error) {
        console.error('Error processing request:', error);
    }

    res.sendStatus(200);
});

// Helper function to send messages
async function sendMessage(chatId, text) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text })
        });

        if (!response.ok) {
            console.error('Failed to send message:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Helper function to send games
async function sendGame(chatId, gameShortName) {
    try {
        const inlineKeyboard = createInlineKeyboard(gameShortName);

        const response = await fetch(`${TELEGRAM_API_URL}/sendGame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                game_short_name: gameShortName,
                reply_markup: { inline_keyboard: inlineKeyboard }
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Failed to send game:', responseData.description);
        } else {
            console.log('Game sent successfully:', responseData);
        }
    } catch (error) {
        console.error('Error sending game:', error);
    }
}

// Create inline keyboard based on game selection
function createInlineKeyboard(gameShortName) {
    switch (gameShortName) {
        case GAME1_SHORT_NAME:
            return [
                [{ text: 'Play Fruit Catcher', callback_game: {} }],
                [{ text: 'Play Endless Runner', callback_data: 'play_endless_runner' }],
                [{ text: 'Play Card Matcher', callback_data: 'play_card_matcher' }],
                [{ text: 'Help', callback_data: 'help' }]
            ];
        case GAME2_SHORT_NAME:
            return [
                [{ text: 'Play Endless Runner', callback_game: {} }],
                [{ text: 'Play Card Matcher', callback_data: 'play_card_matcher' }],
                [{ text: 'Play Fruit Catcher', callback_data: 'play_fruit_catcher' }],
                [{ text: 'Help', callback_data: 'help' }]
            ];
        case GAME3_SHORT_NAME:
            return [
                [{ text: 'Play Card Matcher', callback_game: {} }],
                [{ text: 'Play Fruit Catcher', callback_data: 'play_fruit_catcher' }],
                [{ text: 'Play Endless Runner', callback_data: 'play_endless_runner' }],
                [{ text: 'Help', callback_data: 'help' }]
            ];
        default:
            return [];
    }
}

// Inline query response
async function answerInlineQuery(queryId, gameShortName) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/answerInlineQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inline_query_id: queryId,
                results: [{ type: 'game', id: 'unique_game_id', game_short_name: gameShortName }]
            })
        });

        if (!response.ok) {
            console.error('Failed to answer inline query:', response.statusText);
        }
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
}

// Set up Telegram bot and webhook
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Bot commands and events
bot.start((ctx) => ctx.reply('Welcome to the game! Type /play to start playing.'));
bot.command('play', async (ctx) => {
    await sendGame(ctx.chat.id, GAME1_SHORT_NAME); // Default to Game1
});

// Inline query handling
bot.on('inline_query', async (ctx) => {
    const results = [{ type: 'game', id: 'unique_game_id', game_short_name: GAME1_SHORT_NAME }];
    try {
        await ctx.answerInlineQuery(results);
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
});

// Callback query handling
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.callbackQuery.message.chat.id;

    switch (data) {
        case 'help':
            await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            break;
        case 'play_fruit_catcher':
            await sendGame(chatId, GAME1_SHORT_NAME);
            break;
        case 'play_endless_runner':
            await sendGame(chatId, GAME2_SHORT_NAME);
            break;
        case 'play_card_matcher':
            await sendGame(chatId, GAME3_SHORT_NAME);
            break;
        default:
            console.log('Unknown callback query:', data);
            break;
    }
});

// Set webhook URL for Telegram
async function updateWebhook(webhookUrl) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        });

        if (!response.ok) {
            console.error('Failed to set webhook:', response.statusText);
        } else {
            console.log('Webhook set successfully');
        }
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Start the bot
bot.launch().then(() => {
    console.log('Bot launched successfully');
    updateWebhook(`${VERCEL_URL}/webhook`);
}).catch(error => {
    console.error('Error launching bot:', error);
});

// Ping to keep the server alive
setInterval(() => {
    fetch(VERCEL_URL).catch((error) => console.error('Error pinging server:', error));
}, 1 * 60 * 1000); // Ping every 5 minutes
