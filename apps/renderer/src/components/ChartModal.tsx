import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel } from '@gridforge/core';

export type ChartType = 'column' | 'line' | 'area' | 'pie' | 'scatter';

export interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number };
}

export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selectionRange
}) => {
  const [chartType, setChartType] = useState<ChartType>('column');
  const [chartTitle, setChartTitle] = useState('Data Overview');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Extract data from sheet
  const extractData = () => {
    const labels: string[] = [];
    const values: number[] = [];

    const startRow = selectionRange.startRow;
    const endRow = selectionRange.endRow;
    const labelCol = selectionRange.startCol;
    const valCol = Math.min(selectionRange.startCol + 1, selectionRange.endCol);

    for (let r = startRow; r <= endRow; r++) {
      const labelCell = sheet.getCell(r, labelCol);
      const valCell = sheet.getCell(r, valCol);
      const label = labelCell?.v != null ? String(labelCell.v) : `Row ${r + 1}`;
      const num = Number(valCell?.v);
      if (!isNaN(num)) {
        labels.push(label);
        values.push(num);
      }
    }

    if (values.length === 0) {
      // Fallback sample data
      return {
        labels: ['Cotton Tee', 'Denim Jeans', 'Hoodie Black'],
        values: [120, 85, 210]
      };
    }

    return { labels, values };
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 560;
    const height = 320;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { labels, values } = extractData();
    const colors = ['#0284c7', '#0d9488', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

    // Title
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(chartTitle, width / 2, 24);

    const padLeft = 60;
    const padRight = 30;
    const padTop = 50;
    const padBottom = 50;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxVal = Math.max(...values, 10);
    const minVal = Math.min(0, ...values);

    if (chartType === 'pie') {
      // Pie Chart
      const cx = width / 2;
      const cy = (padTop + height - padBottom) / 2 + 10;
      const radius = Math.min(plotW, plotH) / 2 - 15;
      const total = values.reduce((a, b) => a + b, 0) || 1;

      let startAngle = -Math.PI / 2;
      for (let i = 0; i < values.length; i++) {
        const sliceAngle = (values[i] / total) * Math.PI * 2;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        // Legend / labels
        const midAngle = startAngle + sliceAngle / 2;
        const lx = cx + Math.cos(midAngle) * (radius * 0.7);
        const ly = cy + Math.sin(midAngle) * (radius * 0.7);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round((values[i] / total) * 100)}%`, lx, ly);

        startAngle += sliceAngle;
      }
    } else {
      // Grid lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = padTop + (plotH / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        const v = Math.round(maxVal - (maxVal / gridSteps) * i);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(v), padLeft - 8, y + 3);
      }

      // X-axis baseline
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(padLeft, padTop + plotH);
      ctx.lineTo(width - padRight, padTop + plotH);
      ctx.stroke();

      const stepX = plotW / Math.max(1, values.length);

      if (chartType === 'column') {
        const barWidth = Math.min(48, stepX * 0.6);
        for (let i = 0; i < values.length; i++) {
          const barH = (values[i] / maxVal) * plotH;
          const x = padLeft + stepX * i + (stepX - barWidth) / 2;
          const y = padTop + plotH - barH;

          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
          ctx.fill();

          // X label
          ctx.fillStyle = '#475569';
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i]?.slice(0, 12) || '', x + barWidth / 2, padTop + plotH + 18);
        }
      } else if (chartType === 'line' || chartType === 'area') {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < values.length; i++) {
          const x = padLeft + stepX * i + stepX / 2;
          const y = padTop + plotH - (values[i] / maxVal) * plotH;
          pts.push({ x, y });
        }

        if (chartType === 'area' && pts.length > 0) {
          ctx.fillStyle = 'rgba(2, 132, 199, 0.18)';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, padTop + plotH);
          for (const p of pts) ctx.lineTo(p.x, p.y);
          ctx.lineTo(pts[pts.length - 1].x, padTop + plotH);
          ctx.closePath();
          ctx.fill();
        }

        // Stroke line
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
          else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Dots & labels
        for (let i = 0; i < pts.length; i++) {
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#475569';
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i]?.slice(0, 12) || '', pts[i].x, padTop + plotH + 18);
        }
      } else if (chartType === 'scatter') {
        for (let i = 0; i < values.length; i++) {
          const x = padLeft + stepX * i + stepX / 2;
          const y = padTop + plotH - (values[i] / maxVal) * plotH;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#475569';
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i]?.slice(0, 12) || '', x, padTop + plotH + 18);
        }
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawChart, 20);
    }
  }, [isOpen, chartType, chartTitle]);

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartTitle.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Charts & Visualizations" width="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {/* Chart Options Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ color: 'var(--gf-color-text-secondary)' }}>Type:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="column">Bar / Column</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '240px' }}>
            <label style={{ color: 'var(--gf-color-text-secondary)' }}>Title:</label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Canvas Display */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid var(--gf-color-border-default)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '12px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={handleExportPng}>
              Export PNG
            </Button>
          </div>
          <Button size="sm" variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
