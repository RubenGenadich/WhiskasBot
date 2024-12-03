const TelegramApi = require("node-telegram-bot-api");
const { timer, TOKEN_BOT, SEARCH_PARAMS } = require("./constants");
const { scrapeOzon } = require("./parser");

const RESULT = [];
// Хранение chatId, можно использовать базу данных для сохранения chatId пользователей
let userChatIds = [];

const deletePrice = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [{ text: "Удалить прайс", callback_data: "/deletePrice" }],
    ],
  }),
};

const bot = new TelegramApi(TOKEN_BOT, { polling: true });

bot.setMyCommands([{ command: "/start", description: "Стартуем за скидками" }]);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Сохраняем chatId пользователя, если его еще нет
  if (!userChatIds.includes(chatId)) {
    userChatIds.push(chatId);
  }

  bot.sendMessage(
    chatId,
    "Добро пожаловать! Отправьте ссылку на товар, за которым хотите следить"
  );
  return;
});

bot.on("callback_query", (msg) => {
  const chatId = msg.message.chat.id;
  const data = msg.data;
  SEARCH_PARAMS.maxPrice = 0;

  if (data === "/deletePrice") {
    bot.sendMessage(chatId, `Введи ценник и я продолжу поиск, дура`);
  }
  return;
});

bot.on("message", async (msg) => {
  const url = msg?.link_preview_options?.url;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (url) {
    await bot.sendMessage(
      chatId,
      "Введите сумму за товар и начнем следить за вкусным ценником"
    );
    startInterval(url);
    return;
  }

  if (Number(text) || text === '0') {
    SEARCH_PARAMS.maxPrice = text;
    if (text === '0') {
      return bot.sendMessage(
        chatId,
        `Поиску сказали - стоп`,
      );
      
    }
    return bot.sendMessage(
      chatId,
      `Следим за всем что дешевле ${text} ₽ `,
      deletePrice
    );
  }
});

// Функция для отправки уведомления
const sendNotification = (chatId, message) => {
  bot.sendMessage(chatId, message);
};

// Пример: Отправка уведомления о скидке
const notifyAboutDiscount = () => {
  if (!RESULT.length) return null;

  userChatIds.forEach((chatId) => {
    RESULT.forEach(({ title, price, link }) => {
      sendNotification(
        chatId,
        `${title}\n\nЦена - ${price}₽\n${link}`
      );
    });
  });
};

const startInterval = (msg) => {
  const start = setInterval(async () => {
    if (!SEARCH_PARAMS.maxPrice) return;
    RESULT.length = 0;
    const res = await scrapeOzon(msg);
    RESULT.push(...res);
    notifyAboutDiscount();
  }, timer);
  setTimeout(() => {
    clearInterval(start);
    startInterval(msg);
  }, timer);
};
