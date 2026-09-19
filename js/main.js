"use strict";

const exprEl = document.getElementById("expr");
const resultEl = document.getElementById("result");
const statusLeft = document.getElementById("status-left");
const statusRight = document.getElementById("status-right");
const overlayEl = document.getElementById("overlay");
const overlayInner = document.getElementById("overlay-inner");
const toastEl = document.getElementById("toast");

const PI = Math.PI;
const FULL = 2 * PI;
let angleMode = "deg";
let expression = "";
let lastResult = null;
let error = false;
let toastTimer = null;
let appsIndex = 0;
let storeArmed = false;

const VARS = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, x: 0, y: 0, z: 0 };
const VAR_ORDER = ["A", "B", "C", "D", "E", "F", "x", "y", "z"];

const FNS = {
  sin: (x) => trig(Math.sin, x),
  cos: (x) => trig(Math.cos, x),
  tan: (x) => trig(Math.tan, x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  fact: (x) => factorial(x),
};

const APP_LIST = [
  ["\u2211", "Calculate"],
  ["\u03a3x", "Statistics"],
  ["T\u2192", "Table"],
  ["=f", "Equation"],
  ["\u2264", "Inequality"],
  ["a+bi", "Complex"],
  ["bin", "Base-N"],
  ["Mat", "Matrix"],
  ["Vec", "Vector"],
  ["Spr", "Spreadsheet"],
  ["P(x)", "Distribution"],
  ["a:b", "Ratio"],
];

const CATALOG = [
  { kind: "fn", value: "sin", label: "sin" },
  { kind: "fn", value: "cos", label: "cos" },
  { kind: "fn", value: "tan", label: "tan" },
  { kind: "fn", value: "ln", label: "ln" },
  { kind: "fn", value: "log", label: "log" },
  { kind: "fn", value: "abs", label: "|\u2009|" },
  { kind: "fn", value: "sqrt", label: "\u221a" },
  { kind: "sym", value: "!", label: "x!" },
  { kind: "sym", value: "^2", label: "x\u00b2" },
  { kind: "sym", value: "^", label: "x\u02b8" },
  { kind: "op", value: "(", label: "(" },
  { kind: "op", value: ")", label: ")" },
  { kind: "sym", value: "pi", label: "\u03c0" },
  { kind: "sym", value: "e", label: "e" },
  { kind: "op", value: "%", label: "%" },
];

function trig(fn, x) {
  let rad = x;
  if (angleMode === "deg") rad = x / (180 / PI);
  else if (angleMode === "gra") rad = x * (PI / 200);
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

document.querySelectorAll(".key").forEach((btn) => {
  btn.addEventListener("click", () => handleKey(btn));
});
document.querySelectorAll(".c-arrow, .c-ok").forEach((btn) => {
  btn.addEventListener("click", () => handleKey(btn));
});
document.querySelectorAll(".softkey").forEach((btn) => {
  btn.addEventListener("click", () => openOverlay(btn.dataset.soft));
});

function handleKey(btn) {
  if (btn.hasAttribute("data-num")) input(btn.dataset.num);
  else if (btn.hasAttribute("data-op")) input(btn.dataset.op);
  else if (btn.hasAttribute("data-fn")) inputFunction(btn.dataset.fn);
  else if (btn.hasAttribute("data-sym")) inputSymbol(btn.dataset.sym);
  else if (btn.hasAttribute("data-soft")) openOverlay(btn.dataset.soft);
  else if (btn.hasAttribute("data-cursor")) cursor(btn.dataset.cursor);
  else if (btn.hasAttribute("data-action")) action(btn.dataset.action);
}

function input(ch) {
  if (error) { clearState(); }
  if (isOverlayOpen()) closeOverlay();

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
  if (error) { clearState(); }
  if (isOverlayOpen()) closeOverlay();
  if (lastResult !== null) expression = String(lastResult);
  lastResult = null;
  switch (sym) {
    case "pi":
      expression += "\u03c0";
      break;
    case "e":
      expression += "e";
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
    default:
      expression += sym;
  }
  render();
}

function inputFunction(fn) {
  if (error) { clearState(); }
  if (isOverlayOpen()) closeOverlay();
  if (lastResult !== null) expression = String(lastResult);
  lastResult = null;
  expression += fn + "(";
  render();
}

function action(name) {
  switch (name) {
    case "clear":
      clearState();
      break;
    case "backspace":
      if (isOverlayOpen()) { closeOverlay(); return; }
      if (lastResult !== null || error) { clearState(); return; }
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
    case "swap":
      if (lastResult !== null) {
        expression = String(lastResult);
        lastResult = null;
        render();
      } else {
        toast("SWAP: no answer");
      }
      break;
    case "menu":
      openApps();
      break;
    case "equals":
      if (isOverlayOpen()) confirmOverlay();
      else evaluate();
      break;
    case "ok":
      if (isOverlayOpen()) confirmOverlay();
      else evaluate();
      break;
    case "back":
      if (isOverlayOpen()) closeOverlay();
      break;
  }
}

function clearState() {
  expression = "";
  lastResult = null;
  error = false;
  resultEl.classList.remove("error");
  resultEl.textContent = "0";
  exprEl.textContent = "\u00a0";
}

function render() {
  exprEl.textContent = pretty(expression) || "\u00a0";
  if (!error) resultEl.textContent = lastResult !== null ? String(lastResult) : peekResult();
}

function pretty(src) {
  return src.replace(/\*/g, "\u00d7").replace(/\//g, "\u00f7").replace(/-/g, "\u2212");
}

function peekResult() {
  if (expression === "") return "0";
  try {
    return format(evaluateExpression(expression));
  } catch {
    return "0";
  }
}

function evaluate() {
  if (expression === "" || error) return;
  try {
    const value = evaluateExpression(expression);
    const formatted = format(value);
    exprEl.textContent = pretty(expression);
    resultEl.classList.remove("error");
    resultEl.textContent = formatted;
    expression = formatted;
    lastResult = value;
  } catch (err) {
    error = true;
    resultEl.classList.add("error");
    resultEl.textContent = "Error";
    exprEl.textContent = expression;
  }
}

/* ---------- tokenizer / parser ---------- */

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
    if ("+-*/^()%!\u00d7\u00f7\u2212".includes(ch)) {
      this.pos++;
      return { type: "\u00d7\u00f7\u2212".includes(ch) ? { "\u00d7": "*", "\u00f7": "/", "\u2212": "-" }[ch] : ch };
    }

    const constMatch = rest.match(/^(\u03c0|pi|e)/);
    if (constMatch) {
      this.pos += constMatch[0].length;
      return { type: "const", name: constMatch[0] };
    }

    const fn = rest.match(/^(sin|cos|tan|ln|log|sqrt|abs|fact)\b/);
    if (fn) {
      this.pos += fn[0].length;
      return { type: "fn", name: fn[0] };
    }

    const vr = rest.match(/^[A-Fxyz]\b/);
    if (vr) {
      this.pos += 1;
      return { type: "var", name: vr[0] };
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

  const isValStart = (t) =>
    t && (t.type === "(" || t.type === "const" || t.type === "var" || t.type === "fn" || t.type === "num");

  const parseTerm = () => {
    let left = parseUnary();
    while (cur && (cur.type === "*" || cur.type === "/" || isValStart(cur))) {
      let op = cur.type;
      if (cur.type === "*" || cur.type === "/") cur = tokens.next();
      const right = parseUnary();
      if (op === "/" && right === 0) throw new Error("Division by zero");
      left = op === "/" ? left / right : left * right;
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
      const v = cur.name === "\u03c0" || cur.name === "pi" ? Math.PI : Math.E;
      cur = tokens.next();
      return v;
    }
    if (cur.type === "var") {
      const v = VARS[cur.name];
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

/* ---------- overlays ---------- */

function isOverlayOpen() {
  return !overlayEl.classList.contains("hidden");
}

function openOverlay(name) {
  closeOverlay();
  statusLeft.textContent = name.toUpperCase();
  overlayEl.classList.remove("hidden");
  overlayInner.scrollTop = 0;
  switch (name) {
    case "settings":
      overlaySettings();
      break;
    case "variable":
      overlayVariables();
      break;
    case "function":
      overlayFunction();
      break;
    case "catalog":
      overlayCatalog();
      break;
    case "tools":
      overlayTools();
      break;
  }
}

function overlayTitle(title, hint) {
  const d = document.createElement("div");
  d.className = "overlay-title";
  d.innerHTML = "<span>" + title + "</span><span class='hint'>" + (hint || "ESC") + "</span>";
  return d;
}

function closeOverlay() {
  overlayEl.classList.add("hidden");
  overlayInner.innerHTML = "";
  statusLeft.textContent = "CALC";
  storeArmed = false;
}

function confirmOverlay() {
  const sel = overlayInner.querySelector(".active[data-confirm]") ||
    overlayInner.querySelector(".current[data-confirm]") ||
    overlayInner.querySelector("[data-confirm]");
  if (sel) sel.click();
  else closeOverlay();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1800);
}

function overlaySettings() {
  overlayInner.appendChild(overlayTitle("SETTINGS", "Angle Unit"));
  const list = document.createElement("div");
  list.className = "mode-list";
  [["deg", "Degree", "D"], ["rad", "Radian", "R"], ["gra", "Gradian", "G"]].forEach(([mode, label, key]) => {
    const b = document.createElement("button");
    b.className = "mode-item" + (angleMode === mode ? " current" : "");
    b.innerHTML = "<span class='keyhint'>" + label + "</span><span>" + (angleMode === mode ? "\u2022 " : "") + mode.toUpperCase() + "</span>";
    b.dataset.confirm = mode;
    b.addEventListener("click", () => {
      angleMode = mode;
      statusRight.textContent = mode.toUpperCase() + "  Math";
      closeOverlay();
      if (expression !== "") render();
    });
    list.appendChild(b);
  });
  overlayInner.appendChild(list);
}

function overlayVariables() {
  overlayInner.appendChild(overlayTitle("VARIABLE", storeArmed ? "pick a slot" : "use STORE to save Ans"));
  const note = document.createElement("p");
  note.style.cssText = "margin:0 0 10px;font-size:.6rem;font-weight:700;color:#5a6b60;text-align:right";
  note.textContent = storeArmed
    ? "Store " + (lastResult !== null ? "Ans=" + lastResult : "?") + " \u2192 pick:"
    : "KEY: Ans = " + (lastResult !== null ? String(lastResult) : "-");
  overlayInner.appendChild(note);

  const list = document.createElement("div");
  list.className = "varlist";
  VAR_ORDER.forEach((name) => {
    const b = document.createElement("button");
    b.className = "var-item";
    let val;
    try { val = format(VARS[name]); } catch { val = "0"; }
    b.innerHTML = "<span class='letter'>" + name + "</span><span class='value'>" + val + "</span>";
    b.addEventListener("click", () => {
      if (storeArmed) {
        if (lastResult !== null) {
          VARS[name] = lastResult;
          toast(name + "  \u2190 Ans");
        }
        storeArmed = false;
        overlayVariables();
      } else {
        inputSymbol(name);
        closeOverlay();
      }
    });
    list.appendChild(b);
  });
  overlayInner.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "overlay-actions";
  const store = document.createElement("button");
  store.textContent = storeArmed ? "CANCEL" : "STORE";
  store.className = storeArmed ? "armed" : "";
  store.addEventListener("click", () => {
    if (storeArmed) { storeArmed = false; overlayVariables(); }
    else if (lastResult !== null) { storeArmed = true; overlayVariables(); }
    else toast("nothing to store");
  });
  actions.appendChild(store);
  const clean = document.createElement("button");
  clean.textContent = "RESET";
  clean.addEventListener("click", () => {
    VAR_ORDER.forEach((k) => { VARS[k] = 0; });
    toast("variables reset");
    overlayVariables();
  });
  actions.appendChild(clean);
  overlayInner.appendChild(actions);
}

function overlayFunction() {
  overlayInner.appendChild(overlayTitle("FUNCTION", "wrap input"));
  const mem = document.createElement("div");
  mem.className = "fn-mem";
  const fBtn = document.createElement("button");
  fBtn.innerHTML = "f(x) = x\u00b2 <span class='desc'>square the input</span>";
  fBtn.dataset.confirm = "f";
  fBtn.addEventListener("click", () => { wrap(function (s) { return "(" + s + ")^2"; }); });
  const gBtn = document.createElement("button");
  gBtn.innerHTML = "g(x) = \u221ax <span class='desc'>root of the input</span>";
  gBtn.dataset.confirm = "g";
  gBtn.addEventListener("click", () => { wrap(function (s) { return "sqrt(" + s + ")"; }); });
  mem.appendChild(fBtn);
  mem.appendChild(gBtn);
  overlayInner.appendChild(mem);
}

function wrap(apply) {
  closeOverlay();
  const source = lastResult !== null ? String(lastResult) : expression;
  if (!source) { toast("no input to wrap"); return; }
  expression = apply(source);
  lastResult = null;
  render();
}

function overlayCatalog() {
  overlayInner.appendChild(overlayTitle("CATALOG", "\u03c0 \u00b7 e \u00b7 fns"));
  const grid = document.createElement("div");
  grid.className = "cat-grid";
  CATALOG.forEach((item) => {
    const b = document.createElement("button");
    b.className = "cat-item";
    b.innerHTML = item.label;
    if (item.label === "x\u02b8") b.innerHTML = "x<sup>y</sup>";
    if (item.label === "|\u2009|") b.innerHTML = "|\u2009x\u2009|";
    b.addEventListener("click", () => {
      closeOverlay();
      if (item.kind === "fn") inputFunction(item.value);
      else if (item.kind === "sym") inputSymbol(item.value);
      else input(item.value);
    });
    grid.appendChild(b);
  });
  overlayInner.appendChild(grid);
}

function overlayTools() {
  overlayInner.appendChild(overlayTitle("TOOLS", "help"));
  const rows = [
    ["1\u20139, .", "digits"],
    ["+  -  *  /", "operators"],
    ["^  (  )  !", "power / paren / fact"],
    ["a-f, x, y, z", "insert a variable"],
    ["p / e", "\u03c0 / Euler constant"],
    ["Enter", "EXE (\u2212 result)"],
    ["Backspace", "delete"],
    ["Esc", "cancel / close"],
    ["AC", "all clear"],
  ];
  const list = document.createElement("div");
  list.className = "help-list";
  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    const kb = document.createElement("kbd");
    kb.textContent = k;
    const label = document.createElement("span");
    label.textContent = v;
    row.appendChild(kb);
    row.appendChild(label);
    list.appendChild(row);
  });
  overlayInner.appendChild(list);
}

/* ---------- home / app menu ---------- */

function openApps() {
  closeOverlay();
  appsIndex = 0;
  statusLeft.textContent = "MENU";
  overlayEl.classList.remove("hidden");
  overlayInner.appendChild(overlayTitle("MENU", "\u25c0\u25b2\u25b6\u25bc + OK"));
  const wrap = document.createElement("div");
  wrap.className = "apps";
  APP_LIST.forEach(([glyph, name], i) => {
    const app = document.createElement("button");
    app.className = "app" + (i === appsIndex ? " active" : "");
    app.innerHTML = "<span class='glyph'>" + glyph + "</span><span class='name'>" + name + "</span>";
    app.dataset.index = String(i);
    app.dataset.confirm = name;
    app.addEventListener("click", () => openApp(name));
    wrap.appendChild(app);
  });
  overlayInner.appendChild(wrap);
  paintApps();
}

function paintApps() {
  overlayInner.querySelectorAll(".app").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.index) === appsIndex);
  });
}

function moveApps(dx, dy) {
  const cols = 3;
  let r = Math.floor(appsIndex / cols);
  let c = appsIndex % cols;
  r = Math.min(Math.max(r + dy, 0), Math.floor((APP_LIST.length - 1) / cols));
  c = Math.min(Math.max(c + dx, 0), cols - 1);
  const next = r * cols + c;
  if (next < APP_LIST.length) appsIndex = next;
  paintApps();
}

function openApp(name) {
  closeOverlay();
  if (name === "Calculate") toast("Calculate");
  else toast(name + " \u2014 demo only");
}

function cursor(dir) {
  if (statusLeft.textContent === "MENU") {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = map[dir];
    moveApps(dx, dy);
  }
}

/* ---------- keyboard ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isOverlayOpen()) closeOverlay();
    else action("clear");
    return;
  }
  if (statusLeft.textContent === "MENU" && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    moveApps(e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0, e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0);
    return;
  }
  if (e.key === "Enter" || e.key === "=") {
    e.preventDefault();
    if (isOverlayOpen()) confirmOverlay();
    else evaluate();
    return;
  }

  if (e.key >= "0" && e.key <= "9" || e.key === ".") {
    input(e.key);
    return;
  }

  const keyMap = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "^": "^",
    "%": "%",
    "(": "(",
    ")": ")",
    "!": "!",
    p: "pi",
    e: "e",
    a: "A",
    b: "B",
    c: "C",
    d: "D",
    f: "F",
    x: "x",
    y: "y",
    z: "z",
    Backspace: "backspace",
    Delete: "clear",
  };
  const mapped = keyMap[e.key];
  if (mapped !== undefined) {
    e.preventDefault();
    if (mapped === "backspace") action("backspace");
    else if (mapped === "clear") action("clear");
    else if (mapped === "pi" || mapped === "e" || mapped === "A" || mapped === "B" || mapped === "C" || mapped === "D" || mapped === "F" || mapped === "x" || mapped === "y" || mapped === "z") inputSymbol(mapped);
    else input(mapped);
  }
});