import request from "supertest" ;
import app from "../../app" ;
import { response } from "express";

it('returns a 201 on successful signup' , async () => {
    return request(app)
    .post('/api/users/signup')
    .send({
        email : 'test@test.com' ,
        password : 'testtest'
    })
    .expect(201)
})

it('return a 400 on failed signup' , async () => {
    return request(app)
    .post('/api/users/signup')
    .send({
        email : 'skadk' ,
        password : 'ask'
    })
    .expect(400)
})

it('return a 400 with no email and password on failed signup' , async () => {
    return request(app)
    .post('/api/users/signup')
    .send({
        email : '' ,
        password : ''
    })
    .expect(400)
})

it('it disallows duplicate emails' , async () => {
    await request(app)
    .post('/api/users/signup')
    .send({
        email : 'test@test.com' ,
        password : 'askaskd'
    })
    .expect(201)
    await request(app)
    .post('/api/users/signup')
    .send({
        email : 'test@test.com' ,
        password : 'askaskd'
    })
    .expect(400)
})

it('it returns 201 with setting a Cookie' , async () => {
    // stores the response so we can check if we have the cookie 
    // inside it when we get it back
    const response = await request(app)
    .post('/api/users/signup')
    .send({
        email: 'test@test.com',
        password: 'askaskd'
    })
    .expect(201);

    expect(response.get('Set-Cookie')).toBeDefined()
    expect(response.body.token).toBeDefined()
})