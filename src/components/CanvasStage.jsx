import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Stage, Layer, Image, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import { generateSpline } from '../utils/math';

export default function CanvasStage({
  width,
  height,
  mode,
  bgImage,
  points,
  commitPoints,
  origin,
  setOrigin,
  fourier,
  time,
  path,
  stageRef,
  isRecording,
  epicycleColor,
  pathColor,
  epicycleThickness = 1,
  pathThickness = 3,
  pointSize = 3,
  snapRadius = 15
}) {
  const [image] = useImage(bgImage);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [localPoints, setLocalPoints] = useState(null);
  
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);
  
  const displayPoints = localPoints || points;

  // Arrow Keys Panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow panning when no input fields are focused
      if (document.activeElement.tagName === 'INPUT') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = 30; // pixels to pan
        if (e.key === 'ArrowUp') setStageY(prev => prev + step);
        if (e.key === 'ArrowDown') setStageY(prev => prev - step);
        if (e.key === 'ArrowLeft') setStageX(prev => prev + step);
        if (e.key === 'ArrowRight') setStageX(prev => prev - step);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRelativePointerPosition = (stage) => {
    const pointerPosition = stage.getPointerPosition();
    const stageAttrs = stage.attrs;
    const x = (pointerPosition.x - (stageAttrs.x || 0)) / (stageAttrs.scaleX || 1);
    const y = (pointerPosition.y - (stageAttrs.y || 0)) / (stageAttrs.scaleY || 1);
    return { x, y };
  };

  const getSnappedPoint = (pos) => {
    for (let p of points) {
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < snapRadius) {
        return { x: p.x, y: p.y };
      }
    }
    return pos;
  };

  const [draggedPointIndex, setDraggedPointIndex] = useState(null);

  const handleMouseDown = (e) => {
    if (isRecording) return;
    const stage = e.target.getStage();
    const rawPos = getRelativePointerPosition(stage);
    
    if (e.evt.button === 1) {
       // Middle click pan placeholder
    }

    if (e.target.className === 'Circle' && mode === 'edit') return; 

    if (mode === 'draw-pencil') {
      setIsDrawing(true);
      setLocalPoints([...points, { x: rawPos.x, y: rawPos.y }]);
    } else if (mode === 'draw-line' || mode === 'draw-curve') {
      const pos = getSnappedPoint(rawPos);
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        if (Math.hypot(lastPoint.x - pos.x, lastPoint.y - pos.y) < 1) {
          return; // Avoid adding a consecutive duplicate point
        }
      }
      commitPoints([...points, pos]);
    }
  };

  const handleMouseMove = (e) => {
    if (isRecording || !isDrawing || mode !== 'draw-pencil') return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    
    if (displayPoints.length === 0) {
      setLocalPoints([{ x: pos.x, y: pos.y }]);
      return;
    }
    
    const lastPoint = displayPoints[displayPoints.length - 1];
    const dist = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
    if (dist > 3) {
      setLocalPoints([...displayPoints, { x: pos.x, y: pos.y }]);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && mode === 'draw-pencil') {
      setIsDrawing(false);
      if (localPoints) {
        commitPoints(localPoints);
        setLocalPoints(null);
      }
    }
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    
    const scaleBy = 1.1;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stageX) / oldScale,
      y: (pointer.y - stageY) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    if (newScale < 0.1) newScale = 0.1;

    setStageScale(newScale);
    setStageX(pointer.x - mousePointTo.x * newScale);
    setStageY(pointer.y - mousePointTo.y * newScale);
  };

  const handleStageDragEnd = (e) => {
    if (e.target === stageRef.current) {
      setStageX(e.target.x());
      setStageY(e.target.y());
    }
  };

  const handleDragOrigin = (e) => {
    if (mode === 'moveOrigin') {
      setOrigin({
        x: e.target.x(),
        y: e.target.y()
      });
    }
  };

  const handlePointDragMove = (e, index) => {
    if (mode === 'edit') {
      const newPoints = [...displayPoints];
      newPoints[index] = {
        x: e.target.x(),
        y: e.target.y()
      };
      setLocalPoints(newPoints);
    }
  };

  const handlePointDragStart = (e, index) => {
    if (mode === 'edit') {
      setDraggedPointIndex(index);
    }
  };

  const handlePointDragEnd = () => {
    setDraggedPointIndex(null);
    if (mode === 'edit' && localPoints) {
      commitPoints(localPoints);
      setLocalPoints(null);
    }
  };

  // Convert hex to rgba for strokes
  const hexToRgba = (hex, opacity) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const epicycleStroke = epicycleColor ? hexToRgba(epicycleColor, 1) : "rgba(255, 255, 255, 1)";
  const epicycleLineStroke = epicycleColor ? hexToRgba(epicycleColor, 1) : "rgba(255, 255, 255, 1)";

  const renderPoints = useMemo(() => {
    if (mode === 'draw-curve') {
      return generateSpline(displayPoints, 20, false);
    }
    return displayPoints;
  }, [displayPoints, mode]);

  const linePoints = renderPoints.flatMap(p => [p.x, p.y]);
  const epicyclePath = path.flatMap(p => [p.x, p.y]);

  let epicycles = [];
  if (fourier && fourier.length > 0) {
    let x = origin.x;
    let y = origin.y;
    
    for (let i = 0; i < fourier.length; i++) {
      let prevX = x;
      let prevY = y;
      let freq = fourier[i].freq;
      let radius = fourier[i].amp;
      let phase = fourier[i].phase;
      
      x += radius * Math.cos(freq * time + phase);
      y += radius * Math.sin(freq * time + phase);
      
      epicycles.push(
        <React.Fragment key={i}>
          <Circle
            x={prevX}
            y={prevY}
            radius={radius}
            stroke={epicycleStroke}
            strokeWidth={epicycleThickness}
            listening={false}
          />
          <Line
            points={[prevX, prevY, x, y]}
            stroke={epicycleLineStroke}
            strokeWidth={epicycleThickness}
            listening={false}
          />
        </React.Fragment>
      );
    }
    
    epicycles.push(
      <Circle
        key="tip"
        x={x}
        y={y}
        radius={Math.max(pointSize, epicycleThickness * 1.5)}
        fill={pathColor || "#3b82f6"}
        listening={false}
      />
    );
  }

  return (
    <Stage
      width={width}
      height={height}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stageX}
      y={stageY}
      onWheel={handleWheel}
      draggable={mode === 'pan'}
      onDragEnd={handleStageDragEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        e.evt.preventDefault();
        handleMouseDown(e);
      }}
      onTouchMove={(e) => {
        e.evt.preventDefault();
        handleMouseMove(e);
      }}
      onTouchEnd={handleMouseUp}
      ref={stageRef}
      className="canvas-wrapper"
    >
      <Layer>
        {!isRecording && image && (
          <Image
            image={image}
            opacity={0.6}
            listening={false}
          />
        )}
        
        {/* User drawn line */}
        {!isRecording && (
          <Line
            points={linePoints}
            stroke="#ef4444"
            strokeWidth={2}
            tension={mode === 'draw-curve' ? 0.5 : 0}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        )}

        {/* Edit Points (Control Points) and Snapping Zones */}
        {!isRecording && (mode === 'edit' || mode.startsWith('draw')) && displayPoints.map((p, i) => (
          <React.Fragment key={i}>
            {(mode === 'draw-line' || mode === 'draw-curve') && (
              <Circle
                x={p.x}
                y={p.y}
                radius={snapRadius}
                stroke="rgba(16, 185, 129, 0.4)"
                strokeWidth={1}
                listening={false}
              />
            )}
            <Circle
              x={p.x}
              y={p.y}
              radius={draggedPointIndex === i ? pointSize + 5 : (mode === 'edit' ? pointSize + 3 : pointSize)}
              fill={draggedPointIndex === i ? "#fff" : "#f59e0b"}
              shadowColor={draggedPointIndex === i ? "#f59e0b" : "transparent"}
              shadowBlur={draggedPointIndex === i ? 10 : 0}
              draggable={mode === 'edit'}
              onDragStart={(e) => handlePointDragStart(e, i)}
              onDragMove={(e) => handlePointDragMove(e, i)}
              onDragEnd={handlePointDragEnd}
              onMouseEnter={(e) => {
                if (mode === 'edit') e.target.getStage().container().style.cursor = 'grab';
                if (mode.startsWith('draw') && mode !== 'draw-pencil') {
                  e.target.fill('#10b981');
                  e.target.radius(pointSize + 3);
                  e.target.draw();
                }
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = 'default';
                if (mode.startsWith('draw') && mode !== 'draw-pencil') {
                  e.target.fill('#f59e0b');
                  e.target.radius(pointSize);
                  e.target.draw();
                }
              }}
            />
          </React.Fragment>
        ))}

        {/* Epicycle traced path */}
        <Line
          points={epicyclePath}
          stroke={pathColor || "#3b82f6"}
          strokeWidth={pathThickness}
          lineCap="round"
          lineJoin="round"
        />

        {/* Epicycles */}
        {epicycles}

        {/* Origin Marker */}
        {!isRecording && (
          <Circle
            x={origin.x}
            y={origin.y}
            radius={pointSize + 5}
            fill={mode === 'moveOrigin' ? "#10b981" : "#475569"}
            draggable={mode === 'moveOrigin'}
            onDragMove={handleDragOrigin}
            onMouseEnter={(e) => {
              if(mode === 'moveOrigin') {
                e.target.getStage().container().style.cursor = 'grab';
              }
            }}
            onMouseLeave={(e) => {
              e.target.getStage().container().style.cursor = 'default';
            }}
          />
        )}
      </Layer>
    </Stage>
  );
}
