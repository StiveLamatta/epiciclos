import React, { useRef, useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Image, Line, Circle, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import { renderMixedPoints } from '../utils/math';

const CanvasStage = forwardRef(function CanvasStage({
  width,
  height,
  mode,
  activeTab = 'draw',
  bgImage,
  layers = [],
  activeLayerId,
  commitLayerPoints,
  setLayerOrigin,
  time = 0,
  stageRef,
  isRecording = false,
  isAnimating = false,
  showEpicyclesPreview = false,
  pointSize = 3,
  snapRadius = 15,
  recordingBox,
  setRecordingBox,
  showRecordingBox = false
}, ref) {
  const [image] = useImage(bgImage);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [localPoints, setLocalPoints] = useState(null);
  const lastDistRef = useRef(0);
  
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);

  // Capa activa actual
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0] || {
    id: 'default',
    points: [],
    drawType: 'pencil',
    origin: { x: width / 2, y: height / 2 }
  };

  const currentPoints = localPoints || activeLayer.points || [];

  // Exponer métodos de zoom y vista
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      setStageScale(prev => Math.min(prev * 1.3, 10));
    },
    zoomOut: () => {
      setStageScale(prev => Math.max(prev / 1.3, 0.1));
    },
    resetView: () => {
      setStageScale(1);
      setStageX(0);
      setStageY(0);
    }
  }));

  // Arrow Keys Panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = 30;
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
    if (!pointerPosition) return { x: 0, y: 0 };
    const stageAttrs = stage.attrs;
    const x = (pointerPosition.x - (stageAttrs.x || 0)) / (stageAttrs.scaleX || 1);
    const y = (pointerPosition.y - (stageAttrs.y || 0)) / (stageAttrs.scaleY || 1);
    return { x, y };
  };

  const getSnappedPoint = (pos) => {
    if (snapRadius <= 0 || currentPoints.length === 0) return pos;
    for (let p of currentPoints) {
      if (Math.hypot(p.x - pos.x, p.y - pos.y) <= snapRadius) {
        return { x: p.x, y: p.y };
      }
    }
    return pos;
  };

  const [draggedPointIndex, setDraggedPointIndex] = useState(null);

  const handleMouseDown = (e) => {
    if (isRecording) return;
    if (activeTab !== 'draw' && mode !== 'moveOrigin') return;

    const stage = e.target.getStage();
    const rawPos = getRelativePointerPosition(stage);

    if (e.target.className === 'Circle' && (mode === 'edit' || e.target.attrs.name === 'boxHandle')) return; 

    const isCurve = mode === 'draw-curve';

    if (mode === 'draw-pencil') {
      setIsDrawing(true);
      const pos = getSnappedPoint(rawPos);
      setLocalPoints([...activeLayer.points, { x: pos.x, y: pos.y, isCurve: false }]);
    } else if (mode === 'draw-line' || mode === 'draw-curve') {
      const pos = getSnappedPoint(rawPos);
      if (activeLayer.points.length > 0) {
        const lastPoint = activeLayer.points[activeLayer.points.length - 1];
        if (Math.hypot(lastPoint.x - pos.x, lastPoint.y - pos.y) < 1) {
          return;
        }
      }
      commitLayerPoints([...activeLayer.points, { x: pos.x, y: pos.y, isCurve }]);
    }
  };

  const handleMouseMove = (e) => {
    if (isRecording || !isDrawing || mode !== 'draw-pencil' || activeTab !== 'draw') return;
    const stage = e.target.getStage();
    const rawPos = getRelativePointerPosition(stage);
    
    if (currentPoints.length === 0) {
      setLocalPoints([{ x: rawPos.x, y: rawPos.y, isCurve: false }]);
      return;
    }
    
    const lastPoint = currentPoints[currentPoints.length - 1];
    const dist = Math.hypot(rawPos.x - lastPoint.x, rawPos.y - lastPoint.y);
    if (dist > 3) {
      const pos = (currentPoints.length > 10 && snapRadius > 0 && Math.hypot(rawPos.x - currentPoints[0].x, rawPos.y - currentPoints[0].y) <= snapRadius)
        ? { x: currentPoints[0].x, y: currentPoints[0].y }
        : rawPos;

      setLocalPoints([...currentPoints, { x: pos.x, y: pos.y, isCurve: false }]);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && mode === 'draw-pencil') {
      setIsDrawing(false);
      if (localPoints) {
        commitLayerPoints(localPoints);
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
    if (newScale > 10) newScale = 10;

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
    if (mode === 'moveOrigin' && setLayerOrigin) {
      setLayerOrigin({
        x: e.target.x(),
        y: e.target.y()
      });
    }
  };

  const handlePointDragMove = (e, index) => {
    if (mode === 'edit' && activeTab === 'draw') {
      const newPoints = [...currentPoints];
      newPoints[index] = {
        ...newPoints[index],
        x: e.target.x(),
        y: e.target.y()
      };
      setLocalPoints(newPoints);
    }
  };

  const handlePointDragStart = (e, index) => {
    if (mode === 'edit' && activeTab === 'draw') {
      setDraggedPointIndex(index);
    }
  };

  const handlePointDragEnd = () => {
    setDraggedPointIndex(null);
    if (mode === 'edit' && localPoints) {
      commitLayerPoints(localPoints);
      setLocalPoints(null);
    }
  };

  // Helpers de formas geométricas para rotores
  const getPolygonPoints = (cx, cy, r, theta, sides) => {
    const pts = [];
    for (let k = 0; k < sides; k++) {
      const angle = theta + (2 * Math.PI * k) / sides;
      pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    return pts;
  };

  const getStarPoints = (cx, cy, r, theta, points = 5) => {
    const pts = [];
    const innerR = r * 0.42;
    const step = Math.PI / points;
    for (let k = 0; k < points * 2; k++) {
      const currentR = k % 2 === 0 ? r : innerR;
      const angle = theta + k * step;
      pts.push(cx + currentR * Math.cos(angle), cy + currentR * Math.sin(angle));
    }
    return pts;
  };

  const getHeartPoints = (cx, cy, r, theta, samples = 25) => {
    const pts = [];
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    
    const p0 = { u: 0, v: 0 };
    const p1 = { u: -0.22 * r, v: 0.58 * r };
    const p2 = { u: 0.45 * r, v: 0.68 * r };
    const p3 = { u: r, v: 0 };
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const u = Math.pow(1 - t, 3) * p0.u + 3 * Math.pow(1 - t, 2) * t * p1.u + 3 * (1 - t) * Math.pow(t, 2) * p2.u + Math.pow(t, 3) * p3.u;
      const v = Math.pow(1 - t, 3) * p0.v + 3 * Math.pow(1 - t, 2) * t * p1.v + 3 * (1 - t) * Math.pow(t, 2) * p2.v + Math.pow(t, 3) * p3.v;
      pts.push(cx + u * cosT - v * sinT, cy + u * sinT + v * cosT);
    }
    
    const q0 = { u: r, v: 0 };
    const q1 = { u: 0.45 * r, v: -0.68 * r };
    const q2 = { u: -0.22 * r, v: -0.58 * r };
    const q3 = { u: 0, v: 0 };
    
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const u = Math.pow(1 - t, 3) * q0.u + 3 * Math.pow(1 - t, 2) * t * q1.u + 3 * (1 - t) * Math.pow(t, 2) * q2.u + Math.pow(t, 3) * q3.u;
      const v = Math.pow(1 - t, 3) * q0.v + 3 * Math.pow(1 - t, 2) * t * q1.v + 3 * (1 - t) * Math.pow(t, 2) * q2.v + Math.pow(t, 3) * q3.v;
      pts.push(cx + u * cosT - v * sinT, cy + u * sinT + v * cosT);
    }
    
    return pts;
  };

  const getCustomShapePoints = (cx, cy, r, theta, relativePts) => {
    if (!relativePts || relativePts.length === 0) return [];
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const pts = [];
    for (let i = 0; i < relativePts.length; i++) {
      const u = relativePts[i].u * r;
      const v = relativePts[i].v * r;
      pts.push(cx + u * cosT - v * sinT, cy + u * sinT + v * cosT);
    }
    return pts;
  };

  const isPanEnabled = mode === 'pan' || activeTab !== 'draw';
  const shouldRenderEpicycles = isAnimating || showEpicyclesPreview || mode === 'moveOrigin' || isRecording;

  return (
    <Stage
      width={width}
      height={height}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stageX}
      y={stageY}
      onWheel={handleWheel}
      draggable={isPanEnabled}
      onDragEnd={handleStageDragEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        if (e.evt.touches.length === 2) {
          e.evt.preventDefault();
          const touch1 = e.evt.touches[0];
          const touch2 = e.evt.touches[1];
          const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          lastDistRef.current = dist;
        } else {
          handleMouseDown(e);
        }
      }}
      onTouchMove={(e) => {
        if (e.evt.touches.length === 2) {
          e.evt.preventDefault();
          const touch1 = e.evt.touches[0];
          const touch2 = e.evt.touches[1];
          const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          
          if (!lastDistRef.current) {
            lastDistRef.current = dist;
            return;
          }

          const scaleBy = dist / lastDistRef.current;
          const stage = stageRef.current;
          const oldScale = stageScale;
          
          let newScale = oldScale * scaleBy;
          if (newScale < 0.1) newScale = 0.1;
          if (newScale > 10) newScale = 10;

          const clientX = (touch1.clientX + touch2.clientX) / 2;
          const clientY = (touch1.clientY + touch2.clientY) / 2;
          
          const rect = stage.container().getBoundingClientRect();
          const pointer = {
            x: clientX - rect.left,
            y: clientY - rect.top
          };

          const mousePointTo = {
            x: (pointer.x - stageX) / oldScale,
            y: (pointer.y - stageY) / oldScale,
          };

          setStageScale(newScale);
          setStageX(pointer.x - mousePointTo.x * newScale);
          setStageY(pointer.y - mousePointTo.y * newScale);
          
          lastDistRef.current = dist;
        } else {
          handleMouseMove(e);
        }
      }}
      onTouchEnd={(e) => {
        lastDistRef.current = 0;
        handleMouseUp(e);
      }}
      ref={stageRef}
      className="canvas-wrapper"
    >
      <Layer>
        {/* Imagen de fondo de guía */}
        {!isRecording && image && (
          <Image
            image={image}
            opacity={0.6}
            listening={false}
          />
        )}
        
        {/* Renderizado de trazos dibujados de cada capa con COLOR PROPIO de dibujo */}
        {!isRecording && layers.map((layer) => {
          if (layer.visible === false) return null;
          
          const isCurrentActive = layer.id === activeLayer.id;
          const rawPts = isCurrentActive ? currentPoints : (layer.points || []);
          if (rawPts.length === 0) return null;

          const ptsToRender = renderMixedPoints(rawPts, 16, layer.isClosed);
          const flatPoints = ptsToRender.flatMap(p => [p.x, p.y]);

          const userStrokeColor = layer.strokeColor || '#f59e0b';

          return (
            <Line
              key={`line-${layer.id}`}
              points={flatPoints}
              stroke={isCurrentActive ? userStrokeColor : 'rgba(255, 255, 255, 0.3)'}
              strokeWidth={(isCurrentActive ? 2.5 : 1.5) / stageScale}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          );
        })}

        {/* Puntos de edición y anillos de radio de imantación */}
        {!isRecording && activeTab === 'draw' && (mode === 'edit' || mode.startsWith('draw')) && currentPoints.map((p, i) => {
          const isFirstPoint = i === 0;
          return (
            <React.Fragment key={`pt-${i}`}>
              {snapRadius > 0 && (
                <Circle
                  x={p.x}
                  y={p.y}
                  radius={snapRadius}
                  stroke={isFirstPoint ? "rgba(56, 189, 248, 0.6)" : "rgba(16, 185, 129, 0.4)"}
                  strokeWidth={1 / stageScale}
                  dash={[3 / stageScale, 3 / stageScale]}
                  listening={false}
                />
              )}
              <Circle
                x={p.x}
                y={p.y}
                radius={(draggedPointIndex === i ? pointSize + 5 : (mode === 'edit' ? pointSize + 3 : pointSize)) / stageScale}
                fill={draggedPointIndex === i ? "#fff" : (isFirstPoint ? "#38bdf8" : (p.isCurve ? "#a855f7" : "#f59e0b"))}
                stroke="#ffffff"
                strokeWidth={1 / stageScale}
                shadowColor={draggedPointIndex === i ? "#38bdf8" : "transparent"}
                shadowBlur={draggedPointIndex === i ? 10 : 0}
                draggable={mode === 'edit'}
                onDragStart={(e) => handlePointDragStart(e, i)}
                onDragMove={(e) => handlePointDragMove(e, i)}
                onDragEnd={handlePointDragEnd}
              />
            </React.Fragment>
          );
        })}

        {/* Renderizado de Caminos Trazados y Cadenas de Epiciclos */}
        {layers.map((layer) => {
          if (layer.visible === false) return null;

          const fList = layer.effectiveFourier || layer.fourier;
          const lOrigin = layer.origin || { x: width / 2, y: height / 2 };
          const lShape = layer.epicycleShape || 'circle';
          const lCustom = layer.customRotorShape || null;
          const lEpicycleColor = layer.epicycleColor || '#3b82f6';
          const lPathColor = layer.pathColor || '#38bdf8';
          const lEpicycleThick = (layer.epicycleThickness || 1) / stageScale;
          const lPathThick = (layer.pathThickness || 3) / stageScale;
          const lPath = layer.path || [];

          const flatPath = lPath.flatMap(p => [p.x, p.y]);

          const epicycleElements = [];

          // Solo renderizar la cadena de epiciclos si la simulación está activa, en vista previa o moviendo el centro
          if (shouldRenderEpicycles && fList && fList.length > 0) {
            let x = lOrigin.x;
            let y = lOrigin.y;

            for (let i = 0; i < fList.length; i++) {
              let prevX = x;
              let prevY = y;
              let freq = fList[i].freq;
              let radius = fList[i].amp;
              let phase = fList[i].phase;
              let angle = freq * time + phase;

              x += radius * Math.cos(angle);
              y += radius * Math.sin(angle);

              let shapeEl = null;
              if (lShape === 'triangle') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getPolygonPoints(prevX, prevY, radius, angle, 3)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'square') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getPolygonPoints(prevX, prevY, radius, angle, 4)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'heart') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getHeartPoints(prevX, prevY, radius, angle)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'custom' && lCustom) {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getCustomShapePoints(prevX, prevY, radius, angle, lCustom)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'pentagon') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getPolygonPoints(prevX, prevY, radius, angle, 5)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'hexagon') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getPolygonPoints(prevX, prevY, radius, angle, 6)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else if (lShape === 'star') {
                shapeEl = (
                  <Line
                    key={`shp-${i}`}
                    points={getStarPoints(prevX, prevY, radius, angle, 5)}
                    closed={true}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              } else {
                shapeEl = (
                  <Circle
                    key={`shp-${i}`}
                    x={prevX}
                    y={prevY}
                    radius={radius}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                );
              }

              epicycleElements.push(
                <React.Fragment key={`epi-${layer.id}-${i}`}>
                  {shapeEl}
                  <Line
                    points={[prevX, prevY, x, y]}
                    stroke={lEpicycleColor}
                    strokeWidth={lEpicycleThick}
                    listening={false}
                  />
                </React.Fragment>
              );
            }

            epicycleElements.push(
              <Circle
                key={`tip-${layer.id}`}
                x={x}
                y={y}
                radius={Math.max(pointSize * 1.5, 4) / stageScale}
                fill={lPathColor}
                listening={false}
              />
            );
          }

          return (
            <React.Fragment key={`layer-render-${layer.id}`}>
              {/* Estela animada de Fourier */}
              {flatPath.length > 0 && (
                <Line
                  points={flatPath}
                  stroke={lPathColor}
                  strokeWidth={lPathThick}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                />
              )}
              {/* Cadena de Epiciclos */}
              {epicycleElements}
            </React.Fragment>
          );
        })}

        {/* Marcador de Origen / Centro de la Capa Activa */}
        {!isRecording && shouldRenderEpicycles && activeLayer && (
          <Circle
            x={activeLayer.origin?.x || width / 2}
            y={activeLayer.origin?.y || height / 2}
            radius={(pointSize + 5) / stageScale}
            fill={mode === 'moveOrigin' ? "#10b981" : "#475569"}
            stroke="#ffffff"
            strokeWidth={1.5 / stageScale}
            draggable={mode === 'moveOrigin'}
            onDragMove={handleDragOrigin}
          />
        )}

        {/* CUADRO / MARCO DE GRABACIÓN AJUSTABLE */}
        {showRecordingBox && recordingBox && !isRecording && (
          <Group
            x={recordingBox.x}
            y={recordingBox.y}
            draggable={true}
            onDragEnd={(e) => {
              if (setRecordingBox) {
                setRecordingBox(prev => ({
                  ...prev,
                  x: e.target.x(),
                  y: e.target.y()
                }));
              }
            }}
          >
            <Rect
              width={recordingBox.width}
              height={recordingBox.height}
              stroke="#38bdf8"
              strokeWidth={2 / stageScale}
              dash={[8 / stageScale, 6 / stageScale]}
              fill="rgba(56, 189, 248, 0.05)"
            />

            <Line
              points={[recordingBox.width / 3, 0, recordingBox.width / 3, recordingBox.height]}
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth={1 / stageScale}
              listening={false}
            />
            <Line
              points={[(recordingBox.width * 2) / 3, 0, (recordingBox.width * 2) / 3, recordingBox.height]}
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth={1 / stageScale}
              listening={false}
            />
            <Line
              points={[0, recordingBox.height / 3, recordingBox.width, recordingBox.height / 3]}
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth={1 / stageScale}
              listening={false}
            />
            <Line
              points={[0, (recordingBox.height * 2) / 3, recordingBox.width, (recordingBox.height * 2) / 3]}
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth={1 / stageScale}
              listening={false}
            />

            <Circle
              name="boxHandle"
              x={recordingBox.width}
              y={recordingBox.height}
              radius={10 / stageScale}
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth={2 / stageScale}
              draggable={true}
              onDragMove={(e) => {
                const newW = Math.max(80, e.target.x());
                const newH = Math.max(80, e.target.y());
                if (setRecordingBox) {
                  setRecordingBox(prev => ({
                    ...prev,
                    width: newW,
                    height: newH
                  }));
                }
              }}
            />
          </Group>
        )}
      </Layer>
    </Stage>
  );
});

export default CanvasStage;
