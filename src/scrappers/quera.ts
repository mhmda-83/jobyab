import puppeteer from 'puppeteer';

import { ScrapeResult } from './scrape-result';
import { Scrapper } from './scraper';

export class QueraCrawler implements Scrapper {
	baseUrl: string = 'https://quera.ir';
	websiteName: string = 'کوئرا';
	private browser: puppeteer.Browser | undefined;

	async init(): Promise<puppeteer.Browser> {
		this.browser = await puppeteer.launch({
			args: ['--no-sandbox'],
		});

		return this.browser;
	}

	async findJobsByKeyword(
		keyword: string,
		filters?: { city?: string; page?: number }
	): Promise<ScrapeResult[]> {
		if (this.browser === undefined)
			throw new Error('init method should be called first.');
		if (filters && !filters.page) filters.page = 1;
		else if (!filters) filters = { page: 1 };

		const page = await this.browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
		);

		if (filters?.city === 'تهران') {
			await page.goto(
				`${this.baseUrl}/careers/jobs?extra_technologies=${keyword}&city=T&page=${filters.page}`,
				{ timeout: 240000 }
			);
		} else if (filters && filters.city !== 'تهران') {
			await page.goto(
				`${this.baseUrl}/careers/jobs?extra_technologies=${keyword}&city=O&page=${filters.page}`,
				{ timeout: 240000 }
			);
		} else {
			await page.goto(
				`${this.baseUrl}/careers/jobs?extra_technologies=${keyword}&page=${filters.page}`,
				{ timeout: 240000 }
			);
		}

		const errorMessageDiv = await page.$('#error-msg');

		if (errorMessageDiv !== null) {
			return [];
		}

		const resultSize = await page.$eval(
			'#jobs-segment',
			(jobsContainer) => jobsContainer.childElementCount
		);

		const jobs: ScrapeResult[] = [];

		for (let i = 1; i <= resultSize; i++) {
			// eslint-disable-next-line no-await-in-loop
			const job = await page.$eval(
				`#jobs-segment > div:nth-child(${i})`,
				// eslint-disable-next-line @typescript-eslint/no-shadow
				(jobCard, baseUrl, filters, keyword) => {
					const title = jobCard
						.querySelector('div.content > h2 > a > span:nth-child(1)')
						?.innerHTML.trim();
					const salaryElement = jobCard.querySelector(
						'div.content > div:nth-child(4) > span.job-salary'
					);
					const salary = salaryElement
						? salaryElement.innerHTML.trim().replace(/(حقوق)/g, '')
						: undefined;
					const companyName = jobCard
						.querySelector('div.content > div.meta')
						?.innerHTML.split('-')[0]
						.trim();
					let city = jobCard
						.querySelector('div.content > div.meta')
						?.innerHTML.split('-')[1];

					if (city) city = city.trim();

					if (filters?.city && city !== filters.city) {
						return undefined;
					}

					const logoUrl =
						baseUrl +
						document
							.querySelector('div.ui.tiny.image > a > img')
							?.getAttribute('src');
					let pageUrl = document
						.querySelector('div.ui.tiny.image > a')
						?.getAttribute('href');
					pageUrl = pageUrl ? baseUrl + pageUrl : pageUrl;

					return {
						title,
						salary,
						companyName,
						logoUrl,
						pageUrl,
						city,
						websiteName: 'کوئرا',
						keyword,
					};
				},
				this.baseUrl,
				filters,
				keyword
			);

			if (job !== undefined) jobs.push(job);
		}

		return jobs;
	}
}
