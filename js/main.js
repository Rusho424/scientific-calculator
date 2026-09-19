"use strict";

const exprEl = document.getElementById("expr");
const resultEl = document.getElementById("result");
const modeBtn = document.getElementById("mode-btn");

const DEG = 180 / Math.PI;
let angleMode = "deg";
let expression = "";
let lastResult = null;
let error = false;

const FNS = {
  sin: (x) => trig(Math.sin, x),
  cos: (x) => trig(Math.cos, x),
  tan: (x) => trig(Math.tan, x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  fact: (x) => factorial(x),
};

function trig(fn, x) {
  const rad = angleMode === "deg" ? x / DEG : x;
  return fn(rad);
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error("factorial needs a non-negative integer");
  if (n > 170) throw new Error("number too large");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function format(n) {
  if (n === undefined || Number.isNaN(n)) throw new Error("STOP");
  if (!Number.isFinite(n)) throw new Error("Result is not finite");
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(8);
  if (Number.isInteger(n) && String(n).length <= 12) return String(n);
  return String(parseFloat(n.toPrecision(12)));
}

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", () => handleButton(btn));
});

modeBtn.addEventListener("click", () => {
  angleMode = angleMode === "deg" ? "rad" : "deg";
  modeBtn.textContent = angleMode.toUpperCase();
  modeBtn.setAttribute("aria-pressed", String(angleMode === "deg"));
  if (expression !== "" && !error) tryEvaluate();
});

function handleButton(btn) {
  if (btn.hasAttribute("data-num")) input(btn.dataset.num);
  else if (btn.hasAttribute("data-op")) input(btn.dataset.op);
  else if (btn.hasAttribute("data-fn")) inputFunction(btn.dataset.fn);
  else if (btn.hasAttribute("data-sym")) inputSymbol(btn.dataset.sym);
  else if (btn.hasAttribute("data-action")) action(btn.dataset.action);
}

function input(ch) {
  if (error) return;
  if (lastResult !== null && /[-+*/^%!]/.test(ch)) {
    expression = String(lastResult) + ch;
  } else if (lastResult !== null && ch === "(") {
    expression = String(lastResult) + ch;
  } else if (lastResult !== null && /[0-9.]/.test(ch)) {
    expression = ch;
  } else if (lastResult !== null) {
    expression = String(lastResult) + ch;
  } else {
    expression += ch;
  }
  lastResult = null;
  render();
}

function inputSymbol(sym) {
  if (error) return;
  if (lastResult !== null) expression = String(lastResult);
  lastResult = null;
  switch (sym) {
    case "pi":
      expression += Math.PI.toPrecision(15);
      break;
    case "e":
      expression += Math.E.toPrecision(15);
      break;
    case "sqrt":
      expression += "sqrt(";
      break;
    case "^":
      expression += "^";
      break;
    case "^2":
      expression += "^2";
      break;
    case "!":
      expression += "!";
      break;
  }
  render();
}

function inputFunction(fn) {
  if (error) return;
  if (lastResult !== null) expression = String(lastResult);
  lastResult = null;
  expression += fn + "(";
  render();
}

function action(name) {
  switch (name) {
    case "clear":
      expression = "";
      lastResult = null;
      error = false;
      resultEl.classList.remove("error");
      resultEl.textContent = "0";
      exprEl.textContent = "\u00a0";
      break;
    case "backspace":
      if (lastResult !== null || error) {
        action("clear");
        return;
      }
      expression = expression.slice(0, -1);
      render();
      break;
    case "negate":
      if (expression === "") return;
      const re = /(-?\d+\.?\d*(?:[eE][+-]?\d+)?)$/;
      const m = expression.match(re);
      if (m) {
        const num = m[1];
        const flipped = num.startsWith("-") ? num.slice(1) : "-" + num;
        expression = expression.slice(0, m.index) + flipped + expression.slice(m.index + num.length);
        render();
      }
      break;
    case "equals":
      evaluate();
      break;
  }
}

function render() {
  exprEl.textContent = expression || "\u00a0";
  if (!error) resultEl.textContent = lastResult !== null ? String(lastResult) : peekResult();
}

function peekResult() {
  if (expression === "") return "0";
  try {
    return format(evaluateExpression(expression));
  } catch {
    return "0";
  }
}

function tryEvaluate() {
  try {
    return evaluateExpression(expression);
  } catch (err) {
    return null;
  }
}

function evaluate() {
  if (expression === "" || error) return;
  try {
    const value = evaluateExpression(expression);
    const pretty = format(value);
    exprEl.textContent = expression;
    resultEl.classList.remove("error");
    resultEl.textContent = pretty;
    expression = pretty;
    lastResult = value;
  } catch (err) {
    error = true;
    resultEl.classList.add("error");
    resultEl.textContent = "Invalid expression";
    exprEl.textContent = expression;
  }
}

class Tokenizer {
  constructor(src) {
    this.src = src;
    this.pos = 0;
  }

  next() {
    while (this.pos < this.src.length && this.src[this.pos] === " ") this.pos++;
    if (this.pos >= this.src.length) return null;
    const rest = this.src.slice(this.pos);

    const num = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (num) {
      this.pos += num[0].length;
      return { type: "num", value: parseFloat(num[0]) };
    }

    const ch = rest[0];
    if ("+-*/^()%!".includes(ch)) {
      this.pos++;
      return { type: ch };
    }

    const cn = rest.match(/^(pi|e)\b/);
    if (cn) {
      this.pos += cn[0].length;
      return { type: "const", name: cn[0] };
    }

    const fn = rest.match(/^(sin|cos|tan|ln|log|sqrt|fact)\b/);
    if (fn) {
      this.pos += fn[0].length;
      return { type: "fn", name: fn[0] };
    }

    throw new Error("STOP");
  }
}

function evaluateExpression(src) {
  const tokens = new Tokenizer(src);
  let cur = tokens.next();

  const expect = (type) => {
    if (!cur || cur.type !== type) throw new Error("STOP");
    cur = tokens.next();
  };

  const parseExpr = () => {
    let left = parseTerm();
    while (cur && (cur.type === "+" || cur.type === "-")) {
      const op = cur.type;
      cur = tokens.next();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = () => {
    let left = parseUnary();
    while (cur && (cur.type === "*" || cur.type === "/")) {
      const op = cur.type;
      cur = tokens.next();
      const right = parseUnary();
      if (op === "/" && right === 0) throw new Error("Division by zero");
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };

  const parseUnary = () => {
    if (cur && (cur.type === "-" || cur.type === "+")) {
      const sign = cur.type;
      cur = tokens.next();
      const value = parseUnary();
      return sign === "-" ? -value : value;
    }
    return parsePower();
  };

  const parsePower = () => {
    const base = parsePostfix();
    if (cur && cur.type === "^") {
      cur = tokens.next();
      const exp = parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  };

  const parsePostfix = () => {
    let value = parsePrimary();
    while (cur && (cur.type === "%" || cur.type === "!")) {
      if (cur.type === "%") value = value / 100;
      else value = factorial(value);
      cur = tokens.next();
    }
    return value;
  };

  const parsePrimary = () => {
    if (!cur) throw new Error("STOP");
    if (cur.type === "num") {
      const v = cur.value;
      cur = tokens.next();
      return v;
    }
    if (cur.type === "const") {
      const v = cur.name === "pi" ? Math.PI : Math.E;
      cur = tokens.next();
      return v;
    }
    if (cur.type === "(") {
      cur = tokens.next();
      const v = parseExpr();
      expect(")");
      return v;
    }
    if (cur.type === "fn") {
      const name = cur.name;
      cur = tokens.next();
      expect("(");
      const arg = parseExpr();
      expect(")");
      if (!FNS[name]) throw new Error("STOP");
      const result = FNS[name](arg);
      if (Number.isNaN(result)) throw new Error("STOP");
      return result;
    }
    throw new Error("STOP");
  };

  const result = parseExpr();
  if (cur) throw new Error("STOP");
  return result;
}

document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9" || e.key === ".") {
    input(e.key);
    return;
  }
  const map = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "^": "^",
    "%": "%",
    "(": "(",
    ")": ")",
    "!": "!",
    Enter: "equals",
    "=": "equals",
    Backspace: "backspace",
    Delete: "clear",
    Escape: "clear",
  };
  const mapped = map[e.key];
  if (mapped !== undefined) {
    e.preventDefault();
    if (mapped === "equals") evaluate();
    else if (mapped === "backspace") action("backspace");
    else if (mapped === "clear") action("clear");
    else input(mapped);
  }
});