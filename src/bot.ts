import bull from 'bull';
import TelegramBot, {
	InlineKeyboardButton,
	KeyboardButton,
	Message,
	User as TgUser,
} from 'node-telegram-bot-api';

import { getConfig } from './config';
import State from './models/state';
import User from './models/user';
import { cities } from './utils/cities';
import {
	citiesKeyboardGenerator,
	technologiesKeyboardGenerator,
} from './utils/inline-keyboard-generator';
import { technologies } from './utils/technologies';

// eslint-disable-next-line import/no-mutable-exports
let bot: TelegramBot;

const configs = getConfig();

if (configs.isProduction) {
	bot = new TelegramBot(configs.tgBotToken, {
		polling: false,
	});
} else {
	bot = new TelegramBot(configs.tgBotToken, {
		polling: true,
		request: { proxy: 'http://127.0.0.1:8118', url: 'http://google.com' },
	});
}

const messageQueue = new bull('message-queue', configs.redisConnectionString);

const BASE_KEYBOARD: KeyboardButton[][] = [
	[{ text: 'ثبت علاقه‌مندی‌ها' }],
	[{ text: 'ثبت استان' }],
	[{ text: 'جزئیات فنی' }],
];

const BASE_KEYBOARD_FOR_ADMIN: KeyboardButton[][] = [
	[{ text: 'ثبت علاقه‌مندی‌ها' }],
	[{ text: 'ثبت استان' }],
	[{ text: 'جزئیات فنی' }],
	[{ text: 'ارسال پیام به همه کاربران' }],
	[{ text: 'تعداد کاربران' }],
];

const startHandler = async (message: Message, isAdmin: boolean) => {
	await State.deleteOne({ _id: message.from?.id });
	const text = `سلام 👋
به ربات جاب‌یاب خوش اومدی 🥳
کافیه که اطلاعاتی که ازت خواسته میشه رو بدی تا هرموقع که شغل جدیدی با علاقه‌مندیات توی وب‌سایت <a href="https://jobinja.ir">جابینجا</a> یا <a href="https://quera.ir">کوئرا</a> درج شد بهت خبر بدم🤓`;
	return bot.sendMessage(message.chat.id, text, {
		parse_mode: 'HTML',
		reply_to_message_id: message.message_id,
		reply_markup: {
			keyboard: isAdmin ? BASE_KEYBOARD_FOR_ADMIN : BASE_KEYBOARD,
			one_time_keyboard: true,
		},
	});
};

const submitInterestsButtonClicked = async (message: Message) => {
	await State.updateOne(
		{ _id: message.from?.id },
		{ $set: { step: 'selectInterests' } },
		{ upsert: true }
	);

	const user = await User.findById(message.from?.id);

	const interestsKeyboard: InlineKeyboardButton[][] = technologiesKeyboardGenerator(
		user,
		technologies
	);

	bot.sendMessage(
		message.chat.id,
		'می‌تونی از منویی که زیر این پیام هست تکنولوژی‌هایی که دنبال شغل براشون هستی رو انتخاب کنی ⚒👇',
		{
			reply_to_message_id: message.message_id,
			reply_markup: {
				inline_keyboard: interestsKeyboard,
				remove_keyboard: true,
			},
		}
	);
};

const addInterest = async (
	from: TgUser,
	message: Message,
	technology: string | undefined,
	callback_id: string
) => {
	if (!technology) return;
	let user = await User.findById(from.id);
	if (user?.interests.includes(technology)) {
		user.interests.splice(
			user.interests.findIndex((interest) => interest === technology),
			1
		);
		user = await user.save();
		bot.answerCallbackQuery(callback_id, {
			text: `تکنولوژی ${technology} با موفقیت از علاقه‌مندی‌های شما حذف شد❌`,
		});
	} else {
		if (user) {
			user.interests.push(technology);
			user = await user?.save();
		} else {
			await User.updateOne(
				{ _id: from.id },
				{ $push: { interests: technology } },
				{ upsert: true }
			);
			user = await User.findById(from.id);
		}
		bot.answerCallbackQuery(callback_id, {
			text: `تکنولوژی ${technology} با موفقیت به علاقه‌مندی‌های شما اضافه شد✅`,
		});
	}
	const interestsKeyboard: InlineKeyboardButton[][] = technologiesKeyboardGenerator(
		user,
		technologies
	);
	bot.editMessageReplyMarkup(
		{ inline_keyboard: interestsKeyboard },
		{ chat_id: message.chat.id, message_id: message.message_id }
	);
};

const submitCityKeyboardClicked = async (message: Message) => {
	await State.updateOne(
		{ _id: message.from?.id },
		{ $set: { step: 'selectCity' } },
		{ upsert: true }
	);

	const user = await User.findById(message.from?.id);

	const citiesKeyboard = citiesKeyboardGenerator(user?.city, cities);

	bot.sendMessage(
		message.chat.id,
		'با استفاده از منوی زیر استانی که میخوای موقعیت های شغلیش رو برات ارسال کنم رو انتخاب کن ⚒👇',
		{
			reply_markup: { inline_keyboard: citiesKeyboard, remove_keyboard: true },
			reply_to_message_id: message.message_id,
		}
	);
};

const submitCity = async (
	from: TgUser,
	city: string | undefined,
	message: Message,
	callback_id: string
) => {
	if (!city) return;
	await User.updateOne({ _id: from.id }, { city }, { upsert: true });
	bot.answerCallbackQuery(callback_id, {
		text: `استان با موفقیت به ${city} تغییر یافت 🎉✅`,
	});

	const citiesKeyboard: InlineKeyboardButton[][] = citiesKeyboardGenerator(
		city,
		cities
	);

	bot.editMessageReplyMarkup(
		{ inline_keyboard: citiesKeyboard },
		{ chat_id: message.chat.id, message_id: message.message_id }
	);
};

const sendInvalidMessage = (message: Message, isAdmin: boolean) => {
	bot.sendMessage(message.chat.id, 'پیام نامعتبر 📛', {
		reply_to_message_id: message.message_id,
		reply_markup: {
			keyboard: isAdmin ? BASE_KEYBOARD_FOR_ADMIN : BASE_KEYBOARD,
		},
	});
};

const sendCountOfUsers = async (message: Message) => {
	const count = await User.countDocuments();

	const text = `تعداد کاربران موجود در دیتابیس: ${count}`;

	bot.sendMessage(message.chat.id, text, {
		reply_to_message_id: message.message_id,
	});
};

const sendTechnicalDetail = (message: Message) => {
	const text = `<a href="https://www.typescriptlang.org/">TypeScript</a> + <a href="https://nodejs.org/">Node.js</a> + <a href="https://www.mongodb.com/">MongoDB</a> + <a href="https://mongoosejs.com/">Mongoose</a> + <a href="https://pptr.dev/">Puppeteer</a> + <a href="https://github.com/yagop/node-telegram-bot-api/">node-telegram-bot-api</a> = جاب‌یاب 🤩

نحوه کار ربات به این شکله که هر 3 ساعت یک‌بار فرآیند Scrape کردن اطلاعات از جابینجا و کوئرا انجام میشه و اگر شغل جدیدی درج شده بود کاربرایی که کلمه کلیدی مربوط به اون شغل توی لیست علاقه‌مندی هاشون موجود باشه استخراج میشن و در نهایت پیامایی که باید ارسال بشه توی یه کالکشن داخل دیتابیس درج میشه و هر 3 ساعت، 20 دفعه با فاصله زمانی 1 دقیقه 100 تا از پیام های داخل کالکشن به کاربرها ارسال میشن و از داخل کالکشن حذف میشن و علت این کار هم دور زدن محدودیت ارسال پیام از طرف تلگرام هست.

اگه پیشنهاد، انتقاد، حرفی سخنی چیزی دارید به آیدی من پیام بدید 🙏☺️
@MohammadAlian_1383`;
	bot.sendMessage(message.chat.id, text, {
		reply_to_message_id: message.message_id,
		parse_mode: 'HTML',
	});
};

const sendMessageToUsersKeyboardClicked = async (message: Message) => {
	await State.updateOne(
		{ _id: message.chat.id },
		{ step: 'sendMessageToAllUsers' },
		{ upsert: true }
	);
	const text = `متنی که میخوای برای همه بفرستم رو ارسال کن 🚀`;
	bot.sendMessage(message.chat.id, text, {
		reply_to_message_id: message.message_id,
	});
};

const sendMessageToAllUsers = async (message: Message) => {
	if (message.text === undefined) return sendInvalidMessage(message, true);

	const users = await User.find();
	const temporaryMessageQueue: {
		name?: string | undefined;
		data: any;
		opts?: bull.JobOptions | undefined;
	}[] = [];

	users.forEach((user) => {
		temporaryMessageQueue.push({
			data: {
				chatId: user.id,
				text: `پیام جدید از طرف ادمین 🔽\n\n${message.text}`,
			},
			opts: { removeOnComplete: true, priority: 2 },
		});
	});

	await messageQueue.addBulk(temporaryMessageQueue);

	const text = `پیام‌ها با موفقیت به Message Queue اضافه شد ✅`;
	bot.sendMessage(message.chat.id, text, {
		reply_to_message_id: message.message_id,
	});
};

bot.on('message', async (message) => {
	const isAdmin = configs.adminUserIds.includes(message.chat.id.toString());

	if (message.text === undefined) return sendInvalidMessage(message, isAdmin);

	const userState = await State.findById(message.chat.id);

	if (message.text === '/start') {
		startHandler(message, isAdmin);
	} else if (message.text === 'ثبت استان') {
		submitCityKeyboardClicked(message);
	} else if (message.text === 'ثبت علاقه‌مندی‌ها') {
		submitInterestsButtonClicked(message);
	} else if (message.text === 'جزئیات فنی') {
		sendTechnicalDetail(message);
	} else if (isAdmin && message.text === 'تعداد کاربران') {
		sendCountOfUsers(message);
	} else if (isAdmin && message.text === 'ارسال پیام به همه کاربران') {
		sendMessageToUsersKeyboardClicked(message);
	} else if (isAdmin && userState?.step === 'sendMessageToAllUsers') {
		sendMessageToAllUsers(message);
	} else {
		sendInvalidMessage(message, isAdmin);
	}
});

bot.on('callback_query', async ({ from, data, id, message }) => {
	const scope = data?.split(':')[0];
	const userState = await State.findById(from.id);
	if (scope === 'selectCity' && userState?.step === 'selectCity') {
		submitCity(from, data?.split(':')[1], message!, id);
	} else if (scope === 'addInterest' && userState?.step === 'selectInterests') {
		addInterest(from, message!, data?.split(':')[1], id);
	} else {
		bot.answerCallbackQuery(id, { text: 'نامعتبر ⚠️' });
	}
});

export default bot;
