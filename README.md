# SciCalc

A zero-dependency scientific calculator built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no `eval` — just open `index.html`.

## Features

- **Arithmetic** — `+ − × ÷`, unary minus, parentheses, percent, power `x^y`, square `x²`, factorial `x!`
- **Functions** — `sin cos tan ln log √` with a **DEG / RAD** angle toggle
- **Constants** — `π` and `e`
- **Live preview** — the result updates as you type
- **Keyboard support** — digits, operators, `^ ( ) !`, `Enter`, `Backspace`, `Esc`
- **Safe evaluation** — custom tokenizer + recursive descent parser, no `eval`

## Usage

Open `index.html` in any browser. That's it.

## Examples

| Expression | Result |
| --- | --- |
| `2×(3+4)` | 14 |
| `5!` | 120 |
| `2^10` | 1024 |
| `200+10%` | 200.1 |
| `sin(30)` (DEG) | 0.5 |
| `ln(e)` | 1 |

## License

MIT