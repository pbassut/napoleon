# Component Mapping

## Core Components

| Blessed Component  | Ink Equivalent                               | Migration Notes                                        |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `blessed.screen`   | `<App>` with `render()`                      | Top-level component with Ink's render function         |
| `blessed.box`      | `<Box>`                                      | Direct equivalent with flexbox layout                  |
| `blessed.text`     | `<Text>`                                     | Simple text rendering with style props                 |
| `blessed.list`     | `<SelectInput>` or custom `<Box>` + `<Text>` | Requires custom implementation for full feature parity |
| `blessed.textarea` | `<TextInput>` with multiline                 | May need custom wrapper for exact behavior             |
| `blessed.textbox`  | `<TextInput>`                                | Direct equivalent for single-line input                |

## Layout & Styling

| Blessed Feature          | Ink Approach          | Implementation Details                              |
| ------------------------ | --------------------- | --------------------------------------------------- |
| Absolute positioning     | Flexbox layout        | Use `flexDirection`, `justifyContent`, `alignItems` |
| Border styles            | `borderStyle` prop    | Supports 'single', 'double', 'round', etc.          |
| Colors                   | `color` prop          | Uses chalk under the hood                           |
| Width/Height percentages | Native support        | Works with percentage strings                       |
| Focus management         | `useFocus` hook       | Programmatic focus control                          |
| Shadow effects           | Custom implementation | May need gradient or creative styling               |