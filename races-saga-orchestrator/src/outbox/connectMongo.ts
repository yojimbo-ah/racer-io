import mongoose from "mongoose";


export const connectMongo = async (uri: string) => {
    while (true) {
        try {
            await mongoose.connect(uri , {
                directConnection : true
            });
            console.log("Connected to MongoDB");
            return;
        } catch (err) {
            console.log("MongoDB connect failed, retrying...", (err as Error).message);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};