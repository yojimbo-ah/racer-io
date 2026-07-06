import nats , {Stan , StanOptions} from "node-nats-streaming"

class NatsWrapper {
    private _client ?: Stan ;

    get client () : Stan  {
        if (!this._client) {
            throw new Error('Cant acess NATS client before initialiazing it') ;
        }
        return this._client ;
    }
    async connect (clusterId : string , clientId : string , options : StanOptions) {
        this._client = nats.connect(clusterId , clientId , options) ;

        await new Promise<void>((resolve , reject) => {
            this.client.on('connect' , () => {
                console.log('Connected to NATS') ;
                resolve() ;
            }) ;
            this.client.on('error' , (err) => {
                console.log('error connecting to nats' ) ;
                console.log(err) ;
                reject(err) ;
            }) ;
        }) ;
    }
}

export const natsWrapper = new NatsWrapper ()
