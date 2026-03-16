import { TsdrawCanvas } from 'tsdraw-react';

export function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <TsdrawCanvas width="100%" height="100%" />
    </div>
  );
}