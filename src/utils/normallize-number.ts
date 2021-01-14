export const toEnglishDigits = (str: string): string => {
	const persianNumbers = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'];
	const arabicNumbers = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'];
	const englishNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

	return str
		.split('')
		.map(
			(c) =>
				englishNumbers[persianNumbers.indexOf(c)] ||
				englishNumbers[arabicNumbers.indexOf(c)] ||
				c
		)
		.join('');
};
