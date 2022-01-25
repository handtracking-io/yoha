let cursor = null;

export function InitializeCursor() {
  // This element will be moved accross the screen by hand movements.
  cursor = document.createElement('div');
  cursor.style.width = '20px';
  cursor.style.height = '20px';
  cursor.style.backgroundColor = 'blue';
  cursor.style.position = 'fixed';
  cursor.style.top = '100px';
  cursor.style.left = '100px';
  document.body.appendChild(cursor);
}

export function SetCursorVisibility(visible) {
  if (!visible) {
    // cursor.style.display = 'none';
  } else {
    cursor.style.display = 'block';
  }
}

export function SetCursorColor(color) {
  cursor.style.backgroundColor = color;
}

export function SetCursorPosition(left, top) {
  console.log(window.innerHeight * top + 'px');
  cursor.style.top = window.innerHeight * top + 'px';
  cursor.style.left = window.innerWidth * left + 'px';
}
