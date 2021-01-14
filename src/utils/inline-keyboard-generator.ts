import { InlineKeyboardButton } from 'node-telegram-bot-api';
import { IUser } from '../models/user';

export const technologiesKeyboardGenerator = (
	user: IUser | null,
	technologies: { text: string; callback_data: string }[]
) => {
	const interestsKeyboard: InlineKeyboardButton[][] = [];

	for (let i = 0; i < technologies.length; i += 2) {
		const separatedTechs = technologies.slice(i, i + 2);
		const keyboard: InlineKeyboardButton[] = separatedTechs.map(
			(technology) => ({
				text: user?.interests.includes(technology.callback_data.split(':')[1])
					? `${technology.text}✅`
					: technology.text,
				callback_data: technology.callback_data,
			})
		);
		interestsKeyboard.push(keyboard);
	}

	return interestsKeyboard;
};

export const citiesKeyboardGenerator = (
	dataToCheckIfChecked: string | undefined,
	cities: string[]
) => {
	const citiesKeyboard: InlineKeyboardButton[][] = [];
	for (let i = 0; i < cities.length; i += 2) {
		const separatedCities = cities.slice(i, i + 2);
		const keyboard: InlineKeyboardButton[] = separatedCities.map((city) => ({
			text: city === dataToCheckIfChecked ? `${city}✅` : city,
			callback_data: `selectCity:${city}`,
		}));
		citiesKeyboard.push(keyboard);
	}
	return citiesKeyboard;
};
