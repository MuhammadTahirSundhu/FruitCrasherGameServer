const express = require('express');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');

const app = express();
const TELEGRAM_BOT_TOKEN = "7286576213:AAFGoW-q__f4SYLSCnwk4e0CHJ0LP5QlFIs"; // Use environment variables for sensitive data
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAME_URL = "https://fruit-catchers.vercel.app/"; // Use environment variables for URLs
const GAME_SHORT_NAME = 'FruitCatcher'; // Ensure this matches the short name set up in BotFather

app.use(bodyParser.json());

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
                await sendGame(chatId);
            } else {
                await sendMessage(chatId, 'Unknown command. Type /start to begin.');
            }
        } else if (inline_query) {
            const queryId = inline_query.id;
            await answerInlineQuery(queryId);
        } else if (callback_query) {
            const chatId = callback_query.message.chat.id;
            const messageId = callback_query.message.message_id;
            if (callback_query.data === 'play_fruit_catcher') {
                await sendGame(chatId);
            } else if (callback_query.data === 'help') {
                await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            } else {
                console.log('Callback query received:', callback_query.data);
            }
        }
    } catch (error) {
        console.error('Error processing request:', error);
    }

    res.sendStatus(200);
});

async function sendMessage(chatId, text) {
    try {
        const fetch = (await import('node-fetch')).default;

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

async function sendGame(chatId) {
    try {
        const fetch = (await import('node-fetch')).default;

        const payload = {
            chat_id: chatId,
            game_short_name: GAME_SHORT_NAME,
            reply_markup: {
                inline_keyboard: [[{ text: 'Play Fruit Catcher', callback_game: {} }], [{ text: 'Help', callback_data: 'help' }]]
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

async function answerInlineQuery(queryId) {
    try {
        const fetch = (await import('node-fetch')).default;

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
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
}

// Initialize bot and set webhook
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome to the game! Type /play to start playing.'));
bot.command('play', async (ctx) => {
    await sendGame(ctx.chat.id);
});

bot.on('inline_query', async (ctx) => {
    const queryId = ctx.inlineQuery.id;
    const results = [
        {
            type: 'game',
            id: 'unique_game_id',
            game_short_name: GAME_SHORT_NAME
        }
    ];

    try {
        await ctx.answerInlineQuery(results);
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
});

bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        if (ctx.callbackQuery.message) {
            const chatId = ctx.callbackQuery.message.chat.id;
            const messageId = ctx.callbackQuery.message.message_id;

            if (data === 'help') {
                await sendMessage(chatId, 'Welcome to the game! Type /play to start playing.');
            } else if (data === 'play_fruit_catcher') {
                await sendGame(chatId);
            } else {
                console.log('Callback query received:', data);
            }
        } else if (ctx.callbackQuery.inline_message_id) {
            const inlineMessageId = ctx.callbackQuery.inline_message_id;
            console.log('Inline message callback query received:', inlineMessageId);

            // Launch the game by providing the game URL
            try {
                await ctx.answerCbQuery('', { url: GAME_URL });
            } catch (error) {
                console.error('Error answering callback query:', error);
            }
        } else {
            console.error('Unhandled callback query type:', ctx.callbackQuery);
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

async function updateWebhook(url) {
    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url
            })
        });

        if (!response.ok) {
            console.error('Failed to set webhook:', response.statusText);
        }
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
}

// Launch bot and set the webhook URL
bot.launch().then(() => {
    console.log('Bot launched successfully');
    // Update webhook with the local tunnel URL or deployment URL here
    exec('lt --port 3000', (error, stdout, stderr) => {
        if (error) {
            console.error('Error starting LocalTunnel:', error);
            return;
        }
        console.log('LocalTunnel URL:', stdout);
        const url = stdout.trim();
        updateWebhook(`${url}/webhook`);
    });
});
