import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Trash2, Edit2, Eraser, Palette } from 'lucide-react';

interface WhiteboardProps {
  pin: string;
  roomId: string;
  isTeacher?: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ pin, roomId, isTeacher = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4f46e5'); // Indigo default
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<any>(null);

  // Setup Supabase Realtime Channel for drawing broadcast
  useEffect(() => {
    if (!pin || !roomId) return;

    const channelName = `whiteboard-${pin}-${roomId}`;
    console.log(`[Whiteboard] Connecting to realtime channel: ${channelName}`);
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'draw' }, (payload: any) => {
      const { x0, y0, x1, y1, drawColor, size } = payload.payload;
      drawOnCanvas(x0, y0, x1, y1, drawColor, size, false);
    });

    channel.on('broadcast', { event: 'clear' }, () => {
      clearLocalCanvas(false);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      console.log(`[Whiteboard] Leaving channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [pin, roomId]);

  // Adjust canvas size to parent container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get parent dimensions
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = (rect?.width || 800) * window.devicePixelRatio;
    canvas.height = (rect?.height || 500) * window.devicePixelRatio;
    
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    if (context) {
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
    }
  }, []);

  const drawOnCanvas = (
    x0: number, 
    y0: number, 
    x1: number, 
    y1: number, 
    drawColor: string, 
    size: number, 
    shouldBroadcast = true
  ) => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    context.beginPath();
    context.strokeStyle = drawColor;
    context.lineWidth = size;
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();

    if (shouldBroadcast && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw',
        payload: { x0, y0, x1, y1, drawColor, size }
      });
    }
  };

  const clearLocalCanvas = (shouldBroadcast = true) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // Clear with respect to scale
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (shouldBroadcast && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear'
      });
    }
  };

  // Convert client coordinate to canvas relative coordinate
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    lastPointRef.current = coords;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const drawColor = isEraser ? '#ffffff' : color;
    const drawSize = isEraser ? brushSize * 4 : brushSize;

    drawOnCanvas(
      lastPointRef.current.x,
      lastPointRef.current.y,
      coords.x,
      coords.y,
      drawColor,
      drawSize,
      true
    );

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
            {[
              { hex: '#4f46e5', label: 'Indigo' },
              { hex: '#ef4444', label: 'Red' },
              { hex: '#10b981', label: 'Green' },
              { hex: '#f59e0b', label: 'Orange' },
              { hex: '#111827', label: 'Black' }
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setColor(c.hex);
                  setIsEraser(false);
                }}
                className={`w-6 h-6 rounded-full border transition-all ${
                  color === c.hex && !isEraser ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110 border-transparent' : 'border-gray-200 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>

          {/* Tools */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-0.5">
            <button
              onClick={() => setIsEraser(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                !isEraser ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Cọ vẽ"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                isEraser ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Cục tẩy"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Brush size */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs font-semibold text-gray-600">
            <span>Size:</span>
            <input
              type="range"
              min="1"
              max="15"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="w-4 text-center">{brushSize}px</span>
          </div>
        </div>

        {/* Action Controls */}
        <button
          onClick={() => clearLocalCanvas(true)}
          className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
          title="Xóa toàn bộ bảng"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa bảng</span>
        </button>
      </div>

      {/* Canvas workspace container */}
      <div className="flex-1 bg-white relative cursor-crosshair overflow-hidden min-h-[300px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 block bg-white"
        />
        {/* Helper watermark instructions */}
        <div className="absolute bottom-4 right-4 pointer-events-none select-none text-[10px] font-bold text-gray-300 tracking-wider bg-gray-50/50 backdrop-blur-xs px-2.5 py-1 rounded-full border border-gray-100 shadow-2xs">
          BẢNG TƯƠNG TÁC NHÓM REALTIME
        </div>
      </div>
    </div>
  );
};
