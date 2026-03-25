export function blockId() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const CanvasBlockEditor = () => null;

export default CanvasBlockEditor;
