// mock the socketIO library and fix evrything that left 
// mock function for socket used in testing


export const mockIO = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
};

export const getIO = jest.fn(() => mockIO);
export const initSocket = jest.fn();