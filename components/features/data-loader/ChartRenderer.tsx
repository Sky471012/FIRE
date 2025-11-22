"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import "echarts-gl";
import type { VisualizationSpec, QueryResult } from "../../../types/visualization";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "next-themes";

interface ChartRendererProps {
  spec: VisualizationSpec;
  projectPath: string;
}

// Theme-aware color schemes for scientific charts
const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark';
  
  return {
    // Background colors
    background: isDark ? '#1a1a2e' : '#ffffff',
    chartBackground: isDark ? 'rgba(26, 26, 46, 0.3)' : 'rgba(255, 255, 255, 1)',
    
    // Text colors
    titleColor: isDark ? '#e0e0e0' : '#1a1a1a',
    labelColor: isDark ? '#b0b0b0' : '#4a5568',
    axisColor: isDark ? '#b0b0b0' : '#718096',
    
    // Grid and axis lines
    gridLineColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    axisLineColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
    
    // Data colors - scientific palette
    seriesColors: isDark 
      ? ['#5B8FF9', '#61DDAA', '#F6BD16', '#E8684A', '#9270CA', '#5AD8A6', '#FF9845']
      : ['#1e6bb8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c'],
    
    // Tooltip
    tooltipBg: isDark ? 'rgba(50, 50, 70, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: isDark ? 'rgba(100, 100, 130, 0.8)' : 'rgba(200, 200, 200, 0.8)',
  };
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ spec, projectPath }) => {
  const { theme } = useTheme();
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const prevSqlRef = useRef<string>("");

  useEffect(() => {
    // Only fetch if SQL has changed
    if (hasFetchedRef.current && prevSqlRef.current === spec.sql) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        hasFetchedRef.current = true;
        prevSqlRef.current = spec.sql;

        const result = await invoke<QueryResult>("execute_sql_query", {
          query: spec.sql,
          projectPath,
        });

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spec.sql, projectPath]);

  const chartOption = useMemo(() => {
    if (!data || !data.data.length) return {};

    const colors = getThemeColors(theme);
    const { columns, data: rows } = data;
    const xIndex = columns.indexOf(spec.x);
    const yIndices = spec.y.map((col: string) => columns.indexOf(col));
    const zIndex = spec.z ? columns.indexOf(spec.z) : -1;

    if (xIndex === -1 || yIndices.some((i: number) => i === -1)) {
      setError("Column mismatch: specified columns not found in query result");
      return {};
    }

    const rowCount = rows.length;

    switch (spec.plot_type) {
      case "line_chart": {
        const xData = rows.map((row: string[]) => row[xIndex]);
        const series = yIndices.map((yIdx: number, i: number) => ({
          name: spec.y[i],
          type: "line" as const,
          data: rows.map((row: string[]) => parseFloat(row[yIdx]) || 0),
          showSymbol: rowCount <= 100,
          symbolSize: rowCount <= 100 ? 6 : 0,
          sampling: "lttb" as const,
          progressive: 5000,
          progressiveThreshold: 3000,
          animation: rowCount <= 1000,
          lineStyle: {
            width: rowCount > 1000 ? 1 : 2,
          },
          itemStyle: {
            color: colors.seriesColors[i % colors.seriesColors.length],
          },
        }));

        const maxLabels = rowCount > 2000 ? 10 : rowCount > 1000 ? 15 : rowCount > 500 ? 20 : 30;
        const interval = Math.max(0, Math.ceil(xData.length / maxLabels) - 1);

        return {
          color: colors.seriesColors,
          backgroundColor: colors.chartBackground,
          title: {
            text: spec.title || "Line Chart",
            left: "center",
            textStyle: { color: colors.titleColor, fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            textStyle: { color: colors.titleColor },
            axisPointer: {
              type: "cross",
              lineStyle: { type: "dashed", width: 1, color: colors.axisLineColor },
            },
            formatter: (params: any) => {
              if (!Array.isArray(params)) return "";
              const lines = [`<strong>${params[0].axisValue}</strong>`];
              params.forEach((p: any) => {
                const value = typeof p.value === "number" ? p.value.toFixed(2) : p.value;
                lines.push(`${p.marker} ${p.seriesName}: ${value}`);
              });
              return lines.join("<br/>");
            },
          },
          legend: { 
            data: spec.y, 
            top: 30, 
            textStyle: { color: colors.labelColor } 
          },
          grid: { 
            left: "10%", 
            right: "10%", 
            bottom: "15%", 
            top: "15%",
            borderColor: colors.gridLineColor,
          },
          xAxis: {
            type: "category",
            data: xData,
            name: spec.x_label || spec.x,
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: {
              rotate: 45,
              interval: interval,
              color: colors.labelColor,
              formatter: (value: string) => {
                if (rowCount > 1000 && value.length > 10) {
                  return value.substring(0, 10) + "...";
                }
                return value;
              },
            },
            axisTick: {
              interval: interval,
              lineStyle: { color: colors.axisLineColor },
            },
            splitLine: { show: true, lineStyle: { color: colors.gridLineColor } },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y.join(", "),
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: { color: colors.labelColor },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          dataZoom: [
            { 
              type: "inside", 
              start: 0, 
              end: rowCount > 1000 ? 10 : 100,
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
            },
            { 
              type: "slider", 
              start: 0, 
              end: rowCount > 1000 ? 10 : 100,
              height: 30,
              bottom: 10,
              textStyle: { color: colors.labelColor },
              borderColor: colors.axisLineColor,
            },
          ],
          series,
        };
      }

      case "bar_graph": {
        const xData = rows.map((row: string[]) => row[xIndex]);
        const series = yIndices.map((yIdx: number, i: number) => ({
          name: spec.y[i],
          type: "bar" as const,
          data: rows.map((row: string[]) => parseFloat(row[yIdx]) || 0),
          animation: rowCount <= 1000,
          large: rowCount > 1000,
          largeThreshold: 1000,
          itemStyle: {
            color: colors.seriesColors[i % colors.seriesColors.length],
          },
        }));

        const maxLabels = rowCount > 2000 ? 8 : rowCount > 1000 ? 12 : rowCount > 500 ? 18 : 30;
        const interval = Math.max(0, Math.ceil(xData.length / maxLabels) - 1);

        return {
          color: colors.seriesColors,
          backgroundColor: colors.chartBackground,
          title: {
            text: spec.title || "Bar Graph",
            left: "center",
            textStyle: { color: colors.titleColor, fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            textStyle: { color: colors.titleColor },
            axisPointer: { 
              type: "shadow",
              shadowStyle: { color: colors.gridLineColor },
            },
            formatter: (params: any) => {
              if (!Array.isArray(params)) return "";
              const lines = [`<strong>${params[0].axisValue}</strong>`];
              params.forEach((p: any) => {
                const value = typeof p.value === "number" ? p.value.toFixed(2) : p.value;
                lines.push(`${p.marker} ${p.seriesName}: ${value}`);
              });
              return lines.join("<br/>");
            },
          },
          legend: { 
            data: spec.y, 
            top: 30, 
            textStyle: { color: colors.labelColor } 
          },
          grid: { 
            left: "10%", 
            right: "10%", 
            bottom: "15%", 
            top: "15%",
            borderColor: colors.gridLineColor,
          },
          xAxis: {
            type: "category",
            data: xData,
            name: spec.x_label || spec.x,
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: { 
              rotate: 45, 
              color: colors.labelColor,
              interval: interval,
              formatter: (value: string) => {
                if (rowCount > 500 && value.length > 12) {
                  return value.substring(0, 12) + "...";
                }
                return value;
              },
            },
            axisTick: {
              interval: interval,
              lineStyle: { color: colors.axisLineColor },
            },
            splitLine: { show: true, lineStyle: { color: colors.gridLineColor } },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y.join(", "),
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: { color: colors.labelColor },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          dataZoom: [
            { 
              type: "inside", 
              start: 0, 
              end: rowCount > 500 ? 20 : 100,
              zoomOnMouseWheel: true,
            },
            { 
              type: "slider", 
              start: 0, 
              end: rowCount > 500 ? 20 : 100,
              height: 30,
              bottom: 10,
              textStyle: { color: colors.labelColor },
              borderColor: colors.axisLineColor,
            },
          ],
          series,
        };
      }

      case "scatter_plot": {
        const scatterData = rows.map((row: string[]) => [
          parseFloat(row[xIndex]) || 0,
          parseFloat(row[yIndices[0]]) || 0,
        ]);

        return {
          color: colors.seriesColors,
          backgroundColor: colors.chartBackground,
          title: {
            text: spec.title || "Scatter Plot",
            left: "center",
            textStyle: { color: colors.titleColor, fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            textStyle: { color: colors.titleColor },
            formatter: (params: any) => {
              const [x, y] = params.value;
              return `${spec.x}: ${x.toFixed(2)}<br/>${spec.y[0]}: ${y.toFixed(2)}`;
            },
          },
          grid: { 
            left: "10%", 
            right: "10%", 
            bottom: "15%", 
            top: "15%",
            borderColor: colors.gridLineColor,
          },
          xAxis: {
            type: "value",
            name: spec.x_label || spec.x,
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: { color: colors.labelColor },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y[0],
            nameTextStyle: { color: colors.axisColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            axisLabel: { color: colors.labelColor },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          series: [
            {
              type: "scatter",
              data: scatterData,
              symbolSize: 6,
              large: rowCount > 2000,
              largeThreshold: 2000,
              progressive: 8000,
              itemStyle: {
                color: colors.seriesColors[0],
                opacity: 0.7,
              },
            },
          ],
        };
      }

      case "globe_3d": {
        const lonCol = spec.lon || spec.x;
        const latCol = spec.lat || spec.z || "";
        const valueCol = spec.value || spec.y[0];

        const lonIndex = columns.indexOf(lonCol);
        const latIndex = columns.indexOf(latCol);
        const valueIndex = columns.indexOf(valueCol);

        if (lonIndex === -1 || latIndex === -1 || valueIndex === -1) {
          setError("Globe chart requires valid lon, lat, and value columns");
          return {};
        }

        const globeData = rows
          .map((row: string[]) => {
            const lon = parseFloat(row[lonIndex]);
            const lat = parseFloat(row[latIndex]);
            const value = parseFloat(row[valueIndex]) || 0;
            
            if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
              return null;
            }
            
            return {
              value: [lon, lat, Math.max(0, value * 0.1)],
              itemStyle: {
                color: value > 0 ? colors.seriesColors[0] : colors.seriesColors[1],
                opacity: 0.8,
              },
            };
          })
          .filter((item: any) => item !== null);

        // Create earth texture that adapts to theme
        const earthColors = theme === 'dark' 
          ? { ocean1: '#2a9bed', ocean2: '#1a7aad', ocean3: '#0d4d6d' }
          : { ocean1: '#4db8ff', ocean2: '#2a9bed', ocean3: '#1a7aad' };
        
        const earthTextureUrl = `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g"><stop offset="0%" stop-color="${earthColors.ocean1}"/><stop offset="70%" stop-color="${earthColors.ocean2}"/><stop offset="100%" stop-color="${earthColors.ocean3}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`)}`;

        return {
          backgroundColor: colors.chartBackground,
          title: {
            text: spec.title || "3D Globe",
            left: "center",
            textStyle: { color: colors.titleColor, fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            textStyle: { color: colors.titleColor },
            formatter: (params: any) => {
              const [lon, lat, alt] = params.value;
              return `Lon: ${lon.toFixed(2)}°<br/>Lat: ${lat.toFixed(2)}°<br/>Value: ${(alt / 0.1).toFixed(2)}`;
            },
          },
          globe: {
            baseTexture: earthTextureUrl,
            heightTexture: earthTextureUrl,
            displacementScale: 0.04,
            shading: "realistic",
            realisticMaterial: {
              roughness: 0.2,
              metalness: 0.1,
            },
            postEffect: {
              enable: true,
            },
            light: {
              ambient: {
                intensity: theme === 'dark' ? 0.5 : 0.7,
              },
              main: {
                intensity: theme === 'dark' ? 1.8 : 2.2,
                shadow: true,
              },
            },
            viewControl: {
              distance: 180,
              autoRotate: true,
              autoRotateSpeed: 5,
            },
          },
          series: [
            {
              type: "scatter3D",
              coordinateSystem: "globe",
              data: globeData,
              symbolSize: 8,
              itemStyle: {
                opacity: 0.8,
              },
              blendMode: theme === 'dark' ? "lighter" : "source-over",
            },
          ],
        };
      }

      case "scatter_3d": {
        if (zIndex === -1) {
          setError("3D scatter plot requires a valid z-axis column");
          return {};
        }

        const scatter3DData = rows.map((row: string[]) => [
          parseFloat(row[xIndex]) || 0,
          parseFloat(row[yIndices[0]]) || 0,
          parseFloat(row[zIndex]) || 0,
        ]);

        return {
          backgroundColor: colors.chartBackground,
          title: {
            text: spec.title || "3D Scatter Plot",
            left: "center",
            textStyle: { color: colors.titleColor, fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            textStyle: { color: colors.titleColor },
            formatter: (params: any) => {
              const [x, y, z] = params.value;
              return `${spec.x}: ${x.toFixed(2)}<br/>${spec.y[0]}: ${y.toFixed(2)}<br/>${spec.z}: ${z.toFixed(2)}`;
            },
          },
          grid3D: {
            viewControl: {
              projection: "perspective",
              distance: 200,
              minDistance: 100,
              maxDistance: 400,
            },
            boxWidth: 100,
            boxHeight: 100,
            boxDepth: 100,
            light: {
              main: {
                intensity: theme === 'dark' ? 1.2 : 1.5,
                shadow: true,
              },
              ambient: {
                intensity: theme === 'dark' ? 0.4 : 0.6,
              },
            },
            axisLine: {
              lineStyle: { color: colors.axisLineColor },
            },
            splitLine: {
              lineStyle: { color: colors.gridLineColor },
            },
          },
          xAxis3D: {
            name: spec.x_label || spec.x,
            nameTextStyle: { color: colors.axisColor },
            axisLabel: { color: colors.labelColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          yAxis3D: {
            name: spec.y_label || spec.y[0],
            nameTextStyle: { color: colors.axisColor },
            axisLabel: { color: colors.labelColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          zAxis3D: {
            name: spec.z_label || spec.z,
            nameTextStyle: { color: colors.axisColor },
            axisLabel: { color: colors.labelColor },
            axisLine: { lineStyle: { color: colors.axisLineColor } },
            splitLine: { lineStyle: { color: colors.gridLineColor } },
          },
          series: [
            {
              type: "scatter3D",
              data: scatter3DData,
              symbolSize: 6,
              itemStyle: {
                color: colors.seriesColors[0],
                opacity: 0.8,
              },
            },
          ],
        };
      }

      default:
        setError(`Unsupported plot type: ${spec.plot_type}`);
        return {};
    }
  }, [data, spec, theme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-destructive font-semibold">Visualization Error</h4>
            <p className="text-destructive/90 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-700 dark:text-yellow-400">No data available for visualization</p>
      </div>
    );
  }

  const is3D = spec.plot_type === "globe_3d" || spec.plot_type === "scatter_3d";
  const height = is3D ? 600 : 400;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border bg-card shadow-sm">
      <ReactECharts
        option={chartOption}
        style={{ height: `${height}px`, width: "100%" }}
        opts={{ renderer: "canvas", locale: "EN" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

// Memoize to prevent re-renders unless spec or projectPath changes
export default React.memo(
  ChartRenderer,
  (prev, next) =>
    prev.spec.sql === next.spec.sql &&
    prev.spec.plot_type === next.spec.plot_type &&
    prev.projectPath === next.projectPath
);
