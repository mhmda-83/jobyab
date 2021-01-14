interface Config {
	databaseConnectionString: string;
	jobinjaEmail: string;
	jobinjaPassword: string;
	tgBotToken: string;
	isProduction: boolean;
	adminUserIds: string[];
	redisConnectionString: string;
	jobConcurrencyCount: number;
}

const getEnv = (name: string, defaultValue?: string) => {
	const value = process.env[name];
	if (value != null) return value;
	if (defaultValue != null) return defaultValue;
	throw new Error(`Environment ${name} is required.`);
};

export const getConfig = (): Config => ({
	databaseConnectionString: getEnv('DATABASE_CONNECTION_STRING'),
	jobinjaEmail: getEnv('JOBINJA_EMAIL'),
	jobinjaPassword: getEnv('JOBINJA_PASSWORD'),
	tgBotToken: getEnv('TG_BOT_TOKEN'),
	isProduction: getEnv('NODE_ENV') === 'production',
	adminUserIds: getEnv('ADMINS_USER_IDS').split(','),
	redisConnectionString: getEnv('REDIS_CONNECTION_STRING'),
	jobConcurrencyCount: Number(getEnv('JOB_CONCURRENCY_COUNT')),
});
