import mongoose from 'mongoose';
import { ScrapeResult } from '../scrappers/scrape-result';

export interface Job extends ScrapeResult {
	title: string;
	companyName: string;
	pageUrl: string;
}
export interface MJob extends Job, mongoose.Document {}

const schema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	companyName: {
		type: String,
		required: true,
	},
	websiteName: {
		type: String,
		required: true,
	},
	city: String,
	salary: String,
	pageUrl: {
		type: String,
		required: true,
	},
	logoUrl: String,
	keyword: {
		type: String,
		required: true,
	},
});

const model = mongoose.model<MJob>('job', schema);

export default model;
