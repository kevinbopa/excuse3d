export class InputController {
  constructor() {
    this.keys = new Set();
    this.touch = new Set();
    this.listeners = [];
    this.joystick = {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
      radius: 1
    };
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
    const stick = root.querySelector('[data-ui="touch-stick"]');
    const thumb = root.querySelector('[data-ui="touch-thumb"]');

    if (stick && thumb) {
      this.bindJoystick(stick, thumb);
    }

    root.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      const trigger = (event) => {
        event.preventDefault();
        if (action === "interact") {
          onInteract();
        }
      };

      button.addEventListener("pointerdown", trigger);
      this.listeners.push(() => button.removeEventListener("pointerdown", trigger));
    });
  }

  bindJoystick(stick, thumb) {
    const updateThumb = (x, y) => {
      thumb.style.setProperty("--thumb-x", `${x}px`);
      thumb.style.setProperty("--thumb-y", `${y}px`);
    };

    const resetJoystick = () => {
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.joystick.x = 0;
      this.joystick.y = 0;
      updateThumb(0, 0);
    };

    const moveJoystick = (event) => {
      if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) {
        return;
      }

      const rect = stick.getBoundingClientRect();
      const radius = rect.width * 0.34;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let offsetX = event.clientX - centerX;
      let offsetY = event.clientY - centerY;
      const distance = Math.hypot(offsetX, offsetY);

      if (distance > radius) {
        const scale = radius / distance;
        offsetX *= scale;
        offsetY *= scale;
      }

      this.joystick.radius = radius;
      this.joystick.x = offsetX / radius;
      this.joystick.y = offsetY / radius;
      updateThumb(offsetX, offsetY);
    };

    const start = (event) => {
      event.preventDefault();
      this.joystick.active = true;
      this.joystick.pointerId = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      moveJoystick(event);
    };

    const end = (event) => {
      if (event.pointerId !== this.joystick.pointerId) {
        return;
      }
      event.preventDefault();
      resetJoystick();
    };

    stick.addEventListener("pointerdown", start);
    stick.addEventListener("pointermove", moveJoystick);
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
    stick.addEventListener("pointerleave", end);

    this.listeners.push(() => stick.removeEventListener("pointerdown", start));
    this.listeners.push(() => stick.removeEventListener("pointermove", moveJoystick));
    this.listeners.push(() => stick.removeEventListener("pointerup", end));
    this.listeners.push(() => stick.removeEventListener("pointercancel", end));
    this.listeners.push(() => stick.removeEventListener("pointerleave", end));
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

    if (x !== 0 || y !== 0) {
      return { x, y };
    }

    return {
      x: this.joystick.x,
      y: this.joystick.y
    };
  }

  runPressed() {
    return this.pressed(["shift"]);
  }

  clear() {
    this.keys.clear();
    this.touch.clear();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.x = 0;
    this.joystick.y = 0;
  }

  destroy() {
    this.listeners.forEach((dispose) => dispose());
    this.listeners = [];
    this.clear();
  }
}
