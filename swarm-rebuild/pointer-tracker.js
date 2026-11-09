function rememberPointerPosition(pointerEvent) {
  window.__smartRobotPointer = {
    x: pointerEvent.clientX,
    y: pointerEvent.clientY,
  };
}

window.addEventListener("pointermove", rememberPointerPosition, { capture: true, passive: true });
