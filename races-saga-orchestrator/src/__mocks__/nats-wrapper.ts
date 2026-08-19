// this file wile fake (mock) imports for jest so we can do our tests 
// without the need for running nats steraming service 

export const natsWrapper = {
    client : {
        publish: jest.fn().mockImplementation(
            (subject: string, data: string, cb: () => void) => {
                cb();
            }
        )
    }
} ;