import mongoose from 'mongoose';

export interface IState extends mongoose.Document {
	id: number;
	step: string;
	data: unknown;
}

const schema = new mongoose.Schema({
	_id: {
		type: Number,
	},
	step: {
		type: String,
		required: true,
	},
	data: {
		type: Object,
	},
});

const model = mongoose.model<IState>('state', schema);

export default model;
