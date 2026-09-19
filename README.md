# fx-991CW — Web Edition

A zero-dependency scientific calculator styled after the **Casio fx-991CW (ClassWiz)**: plain HTML, CSS, and JavaScript — no frameworks, no build step, no `eval`.

## The CW experience

- **Icon menu** — the MENU key opens a Home screen with the ClassWiz app grid (Calculate + demo apps).
- **Soft keys** — the screen's bottom labels light up five soft keys: **SETTINGS · VARIABLE · FUNCTION · CATALOG · TOOLS**.
- **CATALOG** — trig, logs, roots, powers, factorial, π, e and `%` live in one catalog, like the real machine.
- **SETTINGS** — Degree / Radian / Gradian angle unit.
- **VARIABLE** — nine variables (A–F, x, y, z); STORE saves the current answer.
- **FUNCTION** — f(x)/g(x) wrap shortcuts (square / square root the input).
- **Cursor pad** — arrows + OK navigate the menu (or arrow keys on the keyboard).

## Calculator features

- Arithmetic `+ − × ÷`, unary minus, parentheses, `%`, power `xʸ`, square `x²`, factorial `x!`
- Functions `sin cos tan ln log √ abs` with DEG / RAD / GRAD angle mode
- Constants `π` and `e`
- Implicit multiplication (`2π`, `2x`, `2(3+4)`)
- Variables in expressions, live result preview, full keyboard support
- Safe evaluation — custom tokenizer + recursive descent parser, no `eval`

## Usage

Open `index.html` in any browser. That's it.

## Examples

| Expression | Result |
| --- | --- |
| `2×(3+4)` | 14 |
| `5!` | 120 |
| `2π` | 6.283… |
| `sin(30)` (DEG) | 0.5 |
| `ln(e)` | 1 |
| `200+10%` | 200.1 |

## License

MIT