import bull from 'bull';

import bot from '../bot';
import { getConfig } from '../config';

const configs = getConfig();

const messageQueue = new bull('message-queue', configs.redisConnectionString);

export const startProcessing = () => {
	messageQueue.process(configs.jobConcurrencyCount, (job) =>
		bot.sendMessage(job.data.chatId, job.data.text, {
			parse_mode: 'HTML',
		})
	);
};
