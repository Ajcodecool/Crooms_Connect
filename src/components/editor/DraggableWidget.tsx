import type {
  CSSProperties,
  FC,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { Rnd } from 'react-rnd';

interface BaseWidgetData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  link?: string;
  style?: React.CSSProperties;
}
export type WidgetData =
  | ({ type: 'spotify'; content: string } & BaseWidgetData)
  | ({ type: 'system-card' | 'system-feed' } & BaseWidgetData);

const fontLookup: { [fontname: string]: string } = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  humanist:
    '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif',
};

// Intelligently converts standard Spotify links to embed IFrames safely
const getSpotifyEmbedUrl = (url: string): string => {
  if (!url) return '';
  try {
    // Already an iframe embed format
    if (url.includes('<iframe') && url.includes('src="')) {
      const match = url.match(/src="([^"]+)"/);
      return match ? match[1] : '';
    }

    // Convert direct Spotify App URLs (e.g. https://open.spotify.com/track/123)
    if (url.includes('open.spotify.com')) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      if (!pathname.startsWith('/embed')) {
        return `https://open.spotify.com/embed${pathname}`;
      }
      return url;
    }

    // Support legacy googleusercontent proxy if it exists
    if (url.includes('googleusercontent.com/spotify.com')) {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] !== 'embed') {
        return `https://open.spotify.com/embed/$${parts[0]}/${parts[1]}`;
      }
    }

    return url;
  } catch {
    return url;
  }
};

export const DraggableWidget: FC<
  PropsWithChildren<{
    id: string;
    data: WidgetData;
    isSelected: boolean;
    isEditMode: boolean;
    onSelect?: (id: string) => void;
    onUpdate?: (id: string, changes: Partial<WidgetData>) => void;
    onDelete?: (id: string) => void;
    onDrag?: (
      drag: { id: string; x: number; y: number; w: number; h: number } | null,
    ) => void;
    gridSize?: number;
    lockAspectRatio?: boolean;
    locked?: boolean;
  }>
> = ({
  id,
  data,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  isEditMode,
  gridSize = 1,
  onDrag,
  lockAspectRatio = false,
  locked = false,
  children,
}) => {
  const style = data.style || {};
  const rotation = data.rotation || 0;

  // STRICT NUMBER SAFETY
  const x = Number.isFinite(Number(data.x)) ? Number(data.x) : 0;
  const y = Number.isFinite(Number(data.y)) ? Number(data.y) : 0;
  const w = Number.isFinite(Number(data.width)) ? Number(data.width) : 100;
  const h = Number.isFinite(Number(data.height)) ? Number(data.height) : 100;

  const getBackground = (): string => {
    if (data.type === 'spotify') return 'transparent';
    if (!style.backgroundColor) return 'transparent';
    const hex = style.backgroundColor;
    const alpha = style.opacity !== undefined ? style.opacity : 1;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const fontStack =
    (style.fontFamily && fontLookup[style.fontFamily]) || 'inherit';

  const widgetStyle: CSSProperties = {
    fontFamily: fontStack,
    color: style.color || 'inherit',
    backgroundColor: getBackground(),
    borderRadius: style.borderRadius || '0px',
    border: isEditMode && isSelected ? 'none' : style.border || 'none',
    boxShadow: style.boxShadow || 'none',
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    transform: `rotate(${rotation}deg)`,
  };

  const renderContent = (): ReactNode => {
    if (data.type === 'spotify') {
      const embedUrl = getSpotifyEmbedUrl(data.content);
      return (
        <iframe
          style={{ borderRadius: style.borderRadius || '12px' }}
          src={embedUrl}
          width='100%'
          height='100%'
          frameBorder='0' // TODO: This is deprecated
          allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
          loading='lazy'
          title={`spotify-${id}`}
        ></iframe>
      );
    }
    return children;
  };

  const handleRotateStart: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) {
      console.error("couldn't get bounding rect to rotate");
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const radians = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX,
      );
      const degrees = radians * (180 / Math.PI);
      if (onUpdate) onUpdate(id, { rotation: degrees + 90 });
    };

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // === VIEW MODE ===
  if (!isEditMode) {
    return (
      <div
        style={{
          position: 'absolute',
          top: y,
          left: x,
          width: w,
          height: h,
          zIndex: data.zIndex || 10,
          transform: `rotate(${rotation}deg)`,
        }}
        className='pointer-events-auto transition-transform'
      >
        <div style={widgetStyle}>{renderContent()}</div>
      </div>
    );
  }

  // === EDIT MODE ===
  return (
    <Rnd
      size={{ width: w, height: h }}
      position={{ x, y }}
      onDragStart={() => {
        if (!locked && onSelect) onSelect(id);
      }}
      onDrag={(_, d) => {
        if (!locked && onDrag) onDrag({ id, x: d.x, y: d.y, w, h });
      }}
      onDragStop={(_, d) => {
        if (!locked) {
          if (onUpdate) onUpdate(id, { x: d.x, y: d.y });
          if (onDrag) onDrag(null); // Clear guides
        }
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        if (!locked && onUpdate) {
          onUpdate(id, {
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
            ...position,
          });
        }
      }}
      dragGrid={[gridSize, gridSize]}
      resizeGrid={[gridSize, gridSize]}
      bounds='parent'
      disableDragging={locked}
      enableResizing={!locked}
      lockAspectRatio={lockAspectRatio}
      className={`${isSelected && !locked ? 'outline outline-2 outline-blue-500 z-50' : ''} ${!locked ? 'hover:outline hover:outline-1 hover:outline-slate-500' : ''} z-10`}
    >
      {isSelected && !locked && (
        <>
          <div className='absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-blue-500 z-[59]'></div>
          <button
            onMouseDown={handleRotateStart}
            className='absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-blue-600 border border-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md z-[60] cursor-alias hover:scale-110 transition-transform'
            title='Rotate'
          >
            <i className='fa-solid fa-rotate-right'></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(id);
            }}
            className='absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md z-[60] hover:scale-110 transition-transform'
          >
            <i className='fa-solid fa-xmark'></i>
          </button>
        </>
      )}

      <div
        style={widgetStyle}
        className={
          locked
            ? 'cursor-not-allowed opacity-80 border-2 border-red-500/50'
            : 'cursor-grab active:cursor-grabbing'
        }
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(id);
        }}
      >
        {locked && isSelected && (
          <div className='absolute inset-0 bg-red-500/10 z-50 flex items-center justify-center pointer-events-none'>
            <i className='fa-solid fa-lock text-red-500 text-3xl opacity-50 drop-shadow-md'></i>
          </div>
        )}
        {renderContent()}
      </div>
    </Rnd>
  );
};
