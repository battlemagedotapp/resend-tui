export function pageWindow(itemCount: number, pageSize: number, requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const start = page * pageSize;
  return {
    end: Math.min(itemCount, start + pageSize),
    page,
    pageCount,
    start,
  };
}

export function moveSelection(current: number, amount: number, itemCount: number) {
  return Math.max(0, Math.min(current + amount, Math.max(0, itemCount - 1)));
}

export function shutdown(
  renderer: { destroy(): void },
  exit: (code: number) => void = (code) => process.exit(code),
) {
  renderer.destroy();
  exit(0);
}
