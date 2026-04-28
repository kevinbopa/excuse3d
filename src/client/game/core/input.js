export class InputController {
  constructor() {
    this.keys = new Set();
    this.touch = new Set();
    this.listeners = [];
  }

  mount() {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    this.listeners.push(() => window.removeEventListener("keydown", onKeyDown));
    this.listeners.push(() => window.removeEventListener("keyup", onKeyUp));
  }

  bindTouchButtons(root, onInteract) {
    root.querySelectorAll("[data-move], [data-action]").forEach((button) => {
      const move = button.dataset.move;
      const action = button.dataset.action;

      const start = (event) => {
        event.preventDefault();
        if (move) {
          this.touch.add(move);
        }
        if (action === "interact") {
          onInteract();
        }
      };

      const end = (event) => {
        event.preventDefault();
        if (move) {
          this.touch.delete(move);
        }
      };

      button.addEventListener("touchstart", start, { passive: false });
      button.addEventListener("touchend", end, { passive: false });
      button.addEventListener("touchcancel", end, { passive: false });
      button.addEventListener("mousedown", start);
      button.addEventListener("mouseup", end);
      button.addEventListener("mouseleave", end);

      this.listeners.push(() => button.removeEventListener("touchstart", start));
      this.listeners.push(() => button.removeEventListener("touchend", end));
      this.listeners.push(() => button.removeEventListener("touchcancel", end));
      this.listeners.push(() => button.removeEventListener("mousedown", start));
      this.listeners.push(() => button.removeEventListener("mouseup", end));
      this.listeners.push(() => button.removeEventListener("mouseleave", end));
    });
  }

  pressed(keys) {
    return keys.some((key) => this.keys.has(key));
  }

  moveAxis() {
    let x = 0;
    let y = 0;

    if (this.pressed(["arrowup", "w", "z"]) || this.touch.has("up")) y -= 1;
    if (this.pressed(["arrowdown", "s"]) || this.touch.has("down")) y += 1;
    if (this.pressed(["arrowleft", "a", "q"]) || this.touch.has("left")) x -= 1;
    if (this.pressed(["arrowright", "d"]) || this.touch.has("right")) x += 1;

    return { x, y };
  }

  clear() {
    this.keys.clear();
    this.touch.clear();
  }

  destroy() {
    this.listeners.forEach((dispose) => dispose());
    this.listeners = [];
    this.clear();
  }
}
