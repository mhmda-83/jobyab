/* eslint-disable import/first */
/* eslint-disable import/imports-first */
/* eslint-disable simple-import-sort/imports */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
	path: path.join(__dirname, '..', '.env'),
});

import bull from 'bull';
import mongoose from 'mongoose';
import { Browser } from 'puppeteer';

import { getConfig } from './config';
import JobModel, { Job } from './models/job';
import User from './models/user';
import { JobinjaCrawler } from './scrappers/jobinja';
import { QueraCrawler } from './scrappers/quera';
import { ScrapeResult } from './scrappers/scrape-result';
import { Scrapper } from './scrappers/scraper';

// to get rid of deprecation warning of node-telegram-bot-api
process.env.NTBA_FIX_319 = '1';

import { startProcessing } from './jobs/sendMessages';

const configs = getConfig();

const crawlers: Scrapper[] = [
	new JobinjaCrawler(configs.jobinjaEmail, configs.jobinjaPassword),
	new QueraCrawler(),
];
const scrapersBrowsers: Browser[] = [];
const scraps: Promise<ScrapeResult[]>[] = [];

const messageQueue = new bull('message-queue', configs.redisConnectionString);

const runScraping = async () => {
	const citiesAndInterests = await User.aggregate([
		{
			$group: {
				_id: '$city',
				interests: { $push: '$interests' },
			},
		},
	]);
	citiesAndInterests.forEach((cityAndInterest) => {
		cityAndInterest.interests = cityAndInterest.interests.reduce(
			(previousValue, currentValue) =>
				Array.from(new Set([...previousValue, ...currentValue])),
			[]
		);
	});
	if (citiesAndInterests.length === 0) return;

	for (const crawler of crawlers) {
		// eslint-disable-next-line no-await-in-loop
		scrapersBrowsers.push(await crawler.init());
	}

	const oldJobs = await JobModel.find();
	const newJobs: Job[] = [];

	citiesAndInterests.forEach((cityAndInterest) => {
		cityAndInterest.interests.forEach((interest) => {
			crawlers.forEach((crawler) => {
				scraps.push(
					crawler.findJobsByKeyword(interest, { city: cityAndInterest._id })
				);
			});
		});
	});

	await Promise.all(scraps).then(async (scrapeResults) => {
		scrapeResults.forEach((scrapsResults) => {
			scrapsResults.forEach((scrapResult) => {
				if (
					scrapResult.title == null ||
					scrapResult.pageUrl == null ||
					scrapResult.companyName == null
				)
					return;
				const job: Job = {
					title: scrapResult.title,
					companyName: scrapResult.companyName,
					pageUrl: scrapResult.pageUrl,
					keyword: scrapResult.keyword,
					websiteName: scrapResult.websiteName,
				};
				const isJobExistsInOldJobs =
					oldJobs.find(
						(oldJob) =>
							oldJob.companyName === scrapResult.companyName &&
							oldJob.title === scrapResult.title
					) !== undefined;
				const isJobExistsInNewJobs =
					newJobs.find(
						(newJob) =>
							newJob.companyName === scrapResult.companyName &&
							newJob.title === scrapResult.title
					) !== undefined;
				if (!isJobExistsInOldJobs && !isJobExistsInNewJobs) newJobs.push(job);
			});
		});
		scrapersBrowsers.forEach((browser) => browser.close());
		if (newJobs.length === 0) {
			console.log("there is no new job :( they don't need us any more :_(");
		} else {
			const insertResult = await JobModel.insertMany(newJobs);

			if (oldJobs.length === 0) return;
			const tags = Array.from(new Set(newJobs.map((job) => job.keyword)));
			const usersWhichHasNewJobInterest = await User.find({
				interests: { $in: tags },
			});
			newJobs.forEach((newJob) => {
				const { keyword } = newJob;
				const users = usersWhichHasNewJobInterest.filter((user) =>
					user.interests.includes(keyword)
				);
				users.forEach((user) => {
					const text = `شغل جدید با تکنولوژی ${keyword} در وب‌سایت ${
						newJob.websiteName
					} درج شد 🎉
عنوان : ${newJob.title}
حقوق : ${newJob.salary ? newJob.salary : 'ثبت نشده'}
نام شرکت : ${newJob.companyName}
<a href="${newJob.pageUrl}">مشاهده موقعیت شغلی</a>
`;

					messageQueue.add(
						{ chatId: user.id, text },
						{ delay: 10, attempts: 3, priority: 1, removeOnComplete: true }
					);
				});
			});
			console.log(insertResult.length, 'new job inserted :)');
		}
	});
};

mongoose
	.connect(configs.databaseConnectionString, {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		useCreateIndex: true,
	})
	.then(() => {
		runScraping();
		startProcessing();
		setInterval(() => {
			runScraping();
			console.log('Running Scraping Process...');
		}, 1000 * 60 * 60 * 3);
	})
	.catch(console.error);
