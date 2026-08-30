// this setup can be modifed if you want you can set them manually , 
// and you have to remove this call for the function in the index.ts file
// plus for some reason you cant init the configuration directly from
// the yaml deployment file

import mongoose from "mongoose";


export const prepareMongo = async () => {
    while (true) {
        try {
            const admin = mongoose.connection.db!.admin();

            const status = await admin.command({
                replSetGetStatus: 1
            });

            const primary = status.members?.some(
                (member: any) => member.stateStr === "PRIMARY"
            );

            if (primary) {
                console.log("MongoDB is PRIMARY");
                return;
            }

        } catch (error: any) {

            if (error.code === 94) {
                console.log("Initializing replica set...");

                await mongoose.connection.db!.admin().command({
                    replSetInitiate: {
                        _id: "rs0",
                        members: [
                            {
                                _id: 0,
                                host: process.env.MONGO_SRV
                            }
                        ]
                    }
                });

                console.log("Replica set initialized");
            } else {
                console.log("Waiting for MongoDB...");
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};