import puppeteer from 'puppeteer';

import { ScrapeResult } from './scrape-result';
import { Scrapper } from './scraper';

export class JobinjaCrawler implements Scrapper {
	baseUrl: string = 'https://jobinja.ir';
	websiteName: string = 'جابینجا';
	private browser: puppeteer.Browser | undefined;

	private email: string;
	private password: string;
	constructor(email: string, password: string) {
		this.email = email;
		this.password = password;
	}

	async init(): Promise<puppeteer.Browser> {
		this.browser = await puppeteer.launch({
			args: ['--no-sandbox'],
		});

		const page = await this.browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
		);

		await page.goto(`${this.baseUrl}/login/user`, { timeout: 120000 });

		const emailInput = await page.$('[type=email]');
		await emailInput?.type(this.email);
		const passwordInput = await page.$('[type=password]');
		await passwordInput?.type(this.password);
		const loginButton = await page.$('[type=submit]');

		await Promise.all([
			loginButton?.click(),
			page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }),
		]);

		return this.browser;
	}

	async findJobsByKeyword(
		keyword: string,
		filters?: { city: string }
	): Promise<ScrapeResult[]> {
		if (this.browser === undefined)
			throw new Error('init method should be called first.');

		const page = await this.browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
		);

		if (filters?.city) {
			await page.goto(
				`${this.baseUrl}/jobs?filters%5Bkeywords%5D%5B%5D=${keyword}&filters%5Blocations%5D%5B11%5D=${filters.city}&sort_by=published_at_desc`,
				{ timeout: 120000 }
			);
		} else {
			await page.goto(
				`${this.baseUrl}/jobs?filters%5Bkeywords%5D%5B%5D=${keyword}&sort_by=published_at_desc`,
				{ timeout: 120000 }
			);
		}

		const jobs: ScrapeResult[] = await page.$$eval(
			'#js-jobSeekerSearchResult > div > div.col-md-9.col-xs-12 > section > div > ul > li > div',
			// eslint-disable-next-line @typescript-eslint/no-shadow
			(jobCards, baseUrl, websiteName, keyword) =>
				jobCards.map((jobCard) => {
					const title = jobCard
						.querySelector('div.o-listView__itemInfo > h3 > a')
						?.innerHTML.trim();
					const companyName = jobCard
						.querySelector(
							'div.o-listView__itemInfo > ul > li:nth-child(1) > span'
						)
						?.innerHTML.trim();
					let pageUrl = jobCard
						.querySelector('div.o-listView__itemInfo > h3 > a')
						?.getAttribute('href');
					const pattern = /^https?:\/\//i;
					if (pageUrl != null && !pattern.test(pageUrl)) {
						pageUrl = `${baseUrl}/${pageUrl}`;
					}
					const logoUrl = jobCard
						.querySelector('div.o-listView__itemInfo > a > img')
						?.getAttribute('src');
					const city = jobCard
						.querySelector(
							'div.o-listView__itemInfo > ul > li:nth-child(2) > span'
						)
						?.innerHTML.trim()
						.split('،')[0]
						.trim();
					const salary = jobCard
						.querySelector(
							'div.o-listView__itemInfo > ul > li:nth-child(3) > span > span:nth-child(2)'
						)
						?.innerHTML.trim()
						.replace(/[()]/g, '')
						.replace(/(حقوق)/g, '');

					return {
						title,
						companyName,
						pageUrl,
						logoUrl,
						city,
						salary,
						websiteName,
						keyword,
					};
				}),
			this.baseUrl,
			this.websiteName,
			keyword
		);

		return jobs;
	}
}
