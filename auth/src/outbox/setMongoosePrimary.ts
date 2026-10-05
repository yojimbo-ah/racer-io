// this setup can be modifed if you want you can set them manually , 
// and you have to remove this call for the function in the index.ts file
// plus for some reason you cant init the configuration directly from
// the yaml deployment file

import mongoose from "mongoose";

export const prepareMongo = async () => {
  while (true) {
    try {
      const status = await mongoose.connection.db!.admin().command({ replSetGetStatus: 1 });
      if (status.members?.some((m: any) => m.stateStr === "PRIMARY")) {
        console.log("MongoDB is PRIMARY");
        return;
      }
    } catch (error: any) {
      if (error.code === 94) {                        // NotYetInitialized
        console.log("Initializing replica set...");
        try {
          await mongoose.connection.db!.admin().command({
            replSetInitiate: {
              _id: "rs0",
              members: [{ _id: 0, host: process.env.MONGO_SRV }],
            },
          });
          console.log("Replica set initialized");
        } catch (e: any) {
          if (e.code !== 23) {                        // 23 = AlreadyInitialized
            console.log("replSetInitiate failed, retrying:", e.codeName ?? e.message);
          }
        }
      } else {
        console.log("Waiting for MongoDB...");
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
};