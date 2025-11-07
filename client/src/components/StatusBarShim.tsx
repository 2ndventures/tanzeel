export function StatusBarShim() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-background status-bar-height"
      data-testid="status-bar-shim"
    />
  );
}
