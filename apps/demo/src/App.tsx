import { createRoot } from 'react-dom/client';
import { Tsdraw, type TsdrawCustomTool } from 'tsdraw-react';
import Confetti from 'react-confetti-boom';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { wavyToolDefinition } from './wavyTool.js';

// This is a custom tool which we can easily add to the toolbar using the 'tools' prop
// Go to wavyTool.ts to see how its built using custom logic
const wavyTool: TsdrawCustomTool = {
  id: 'wavy',
  label: 'Wavy',
  icon: <IconStar size={18} />,
  iconSelected: <IconStarFilled size={18} />,
  definition: wavyToolDefinition,
  showStylePanel: true,
};

function triggerConfetti() {
  const container = document.createElement('div');
  container.style.inset = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Confetti mode="boom" particleCount={100} shapeSize={15} spreadDeg={70} />);
}

export function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tsdraw
        width="100%"
        height="100%"
        tools={['select', 'pen', wavyTool, 'eraser', 'hand']}
        initialToolId="pen"
        uiOptions={{
          toolbar: { // top-left, bottom-center, center-right, left-center, ... (it can be any valid anchor)
            placement: { anchor: 'top-center', offsetX: 18, offsetY: 18 },
          },
          stylePanel: {
            placement: { anchor: 'bottom-left', offsetX: 16, offsetY: 16 },
          },
        }}
        onMount={triggerConfetti}
      />
    </div>
  );
}