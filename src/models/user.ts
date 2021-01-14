import mongoose from 'mongoose';

import { cities } from '../utils/cities';

export interface IUser extends mongoose.Document {
	_id: number;
	city: string;
	interests: string[];
}

const schema = new mongoose.Schema({
	_id: {
		type: Number,
	},
	city: {
		type: String,
		enum: cities,
	},
	interests: {
		type: Array,
		default: [],
	},
});

const model = mongoose.model<IUser>('user', schema);

export default model;
