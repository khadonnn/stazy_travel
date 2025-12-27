import mongoose from 'mongoose';
let isConnected = false;
export const connectBookingDB = async () => {
    if(isConnected) return;
    if(process.env.MONGO_URL === undefined){
        throw new Error('MONGO_URL is not defined in environment variables');
    }
    try{
        await mongoose.connect(process.env.MONGO_URL);
        isConnected = true;
        console.log("Connected to MongoDB")
    }catch(err){
        console.error('Failed to connect to MongoDB', err);
        throw err;
    }
}
