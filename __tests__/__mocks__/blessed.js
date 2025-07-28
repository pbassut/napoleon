// Mock for blessed library
module.exports = {
  screen: jest.fn(() => ({
    append: jest.fn(),
    render: jest.fn(),
    destroy: jest.fn(),
    key: jest.fn(),
    on: jest.fn(),
  })),
  box: jest.fn(() => ({
    append: jest.fn(),
    setContent: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    on: jest.fn(),
  })),
  list: jest.fn(() => ({
    append: jest.fn(),
    setItems: jest.fn(),
    select: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    on: jest.fn(),
  })),
  text: jest.fn(() => ({
    setContent: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
  })),
};
