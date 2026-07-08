const mockPipeline = {
    hset: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
};

const redis = {
    exists: jest.fn(),
    hgetall: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    sadd: jest.fn(),
    del: jest.fn(),
    srem: jest.fn(),
    hset: jest.fn(),
    pipeline: jest.fn(() => mockPipeline),
};

export { mockPipeline };
export default redis;
