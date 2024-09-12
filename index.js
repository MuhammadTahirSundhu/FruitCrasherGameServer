const express = require('express');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const localtunnel = require('localtunnel');

const app = express();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7286576213:AAFGoW-q__f4SYLSCnwk4e0CHJ0LP5QlFIs';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const Game1_URL = process.env.Game1_URL || "https://fruit-catchers.vercel.app/";
const Game2_URL = process.env.Game2_URL || "https://endless-runner-rust.vercel.app/";
const Game3_URL = process.env.Game3_URL || "https://card-matching-eight.vercel.app/";
const GAME1_SHORT_NAME = 'FruitCatcher';
const GAME2_SHORT_NAME = 'EndlessRunner';
const GAME3_SHORT_NAME = 'CardMatcher';

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

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
            handleCallbackQuery(callback_query, chatId);
        }
    } catch (error) {
        console.error('Error processing request:', error);
    }

    res.sendStatus(200);
});

async function sendMessage(chatId, text) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        });

        if (!response.ok) {
            console.error('Failed to send message:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function sendGame(chatId, gameShortName) {
    try {
        let inlineKeyboard = createGameKeyboard(gameShortName);

        const payload = {
            chat_id: chatId,
            game_short_name: gameShortName,
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        };

        const response = await fetch(`${TELEGRAM_API_URL}/sendGame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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

function createGameKeyboard(gameShortName) {
    if (gameShortName === GAME1_SHORT_NAME) {
        return [
            [{ text: 'Play Fruit Catcher', callback_game: {} }],
            [{ text: 'Play Endless Runner', callback_data: 'play_endless_runner' }],
            [{ text: 'Play Card Matcher', callback_data: 'play_card_matcher' }],
            [{ text: 'Help', callback_data: 'help' }]
        ];
    } else if (gameShortName === GAME2_SHORT_NAME) {
        return [
            [{ text: 'Play Endless Runner', callback_game: {} }],
            [{ text: 'Play Card Matcher', callback_data: 'play_card_matcher' }],
            [{ text: 'Play Fruit Catcher', callback_data: 'play_fruit_catcher' }],
            [{ text: 'Help', callback_data: 'help' }]
        ];
    } else {
        return [
            [{ text: 'Play Card Matcher', callback_game: {} }],
            [{ text: 'Play Fruit Catcher', callback_data: 'play_fruit_catcher' }],
            [{ text: 'Play Endless Runner', callback_data: 'play_endless_runner' }],
            [{ text: 'Help', callback_data: 'help' }]
        ];
    }
}

async function answerInlineQuery(queryId, gameShortName) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/answerInlineQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inline_query_id: queryId,
                results: [
                    {
                        type: 'game',
                        id: 'unique_game_id',
                        game_short_name: gameShortName
                    }
                ]
            })
        });

        if (!response.ok) {
            console.error('Failed to answer inline query:', response.statusText);
        }
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
}

async function handleCallbackQuery(callback_query, chatId) {
    const data = callback_query.data;

    try {
        if (data === 'help') {
            await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
        } else if (data === 'play_fruit_catcher') {
            await sendGame(chatId, GAME1_SHORT_NAME);
        } else if (data === 'play_endless_runner') {
            await sendGame(chatId, GAME2_SHORT_NAME);
        } else if (data === 'play_card_matcher') {
            await sendGame(chatId, GAME3_SHORT_NAME);
        } else {
            console.log('Callback query received:', data);
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome to the game! Type /play to start playing.'));
bot.command('play', async (ctx) => {
    await sendGame(ctx.chat.id, GAME1_SHORT_NAME); // Default to Game1
});

bot.on('inline_query', async (ctx) => {
    const queryId = ctx.inlineQuery.id;
    const results = [
        {
            type: 'game',
            id: 'unique_game_id',
            game_short_name: GAME1_SHORT_NAME // Default to Game1
        }
    ];

    try {
        await ctx.answerInlineQuery(results);
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
});

bot.on('callback_query', async (ctx) => {
    const chatId = ctx.callbackQuery.message.chat.id;
    await handleCallbackQuery(ctx.callbackQuery, chatId);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.launch().then(async () => {
    console.log('Bot launched successfully');

    // Use LocalTunnel to expose the server to the internet if not in production
    if (!process.env.RENDER_EXTERNAL_URL) {
        const tunnel = await localtunnel({ port: PORT });
        console.log(`Tunnel running at ${tunnel.url}`);
        updateWebhook(`${tunnel.url}/webhook`);
    } else {
        updateWebhook(`${process.env.RENDER_EXTERNAL_URL}/webhook`);
    }
}).catch(error => {
    console.error('Error launching bot:', error);
});

async function updateWebhook(webhookUrl) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl
            })
        });

        if (!response.ok) {
            console.error('Failed to set webhook:', await response.text());
        } else {
            console.log('Webhook set successfully');
        }
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
}
