import puppeteer from 'puppeteer';
import { ScrapeResult } from './scrape-result';

export interface Scrapper {
	baseUrl: string;
	websiteName: string;
	findJobsByKeyword(
		keyword: string,
		filters?: { city?: string; page?: number }
	): Promise<ScrapeResult[]>;
	init(): Promise<puppeteer.Browser>;
}
