import request from "supertest" ;
import app from "../../app" ;


it('respomdes with details about the current user' , async () => {
    const token = await getAuthToken() ;
    expect(token).toBeDefined();

    const reponse2 = await request(app)
    .get('/api/users/currentUser')
    .set('Authorization' , `Bearer ${token}`)
    .send()
    .expect(200)

    expect(reponse2.body.currentUser.email).toEqual('test@test.com') ;

})

it('returns status 200 with user of null if we are not signed in' , async () => {
    const response = await request(app)
    .get('/api/users/currentUser')
    .send()
    .expect(200) ;
    expect(response.body.currentUser).toBeNull() ;
    console.log(response.body) ;
})
