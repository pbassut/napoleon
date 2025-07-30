import createApp from '../../../src/ui/ink/createApp';
import App from '../../../src/ui/ink/App';

// Mock the App component
jest.mock('../../../src/ui/ink/App', () => ({
  default: 'MockedApp',
}));

describe('createApp', () => {
  it('should return the App component', async () => {
    const result = await createApp();
    expect(result).toBe(App);
  });

  it('should be an async function', () => {
    expect(createApp).toBeInstanceOf(Function);
    const result = createApp();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should resolve to the correct type', async () => {
    const AppComponent = await createApp();
    expect(typeof AppComponent).toBe('object'); // App import is an object with default property
  });
});