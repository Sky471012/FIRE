"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import "echarts-gl";
import type { VisualizationSpec, QueryResult } from "../../../types/visualization";
import { invoke } from "@tauri-apps/api/core";

interface ChartRendererProps {
  spec: VisualizationSpec;
  projectPath: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ spec, projectPath }) => {
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
          showSymbol: rowCount <= 100, // Only show symbols for small datasets
          symbolSize: rowCount <= 100 ? 6 : 0,
          sampling: "lttb" as const, // Largest-Triangle-Three-Buckets downsampling
          progressive: 5000, // Progressive rendering threshold
          progressiveThreshold: 3000,
          animation: rowCount <= 1000, // Disable animation for large datasets
          lineStyle: {
            width: rowCount > 1000 ? 1 : 2, // Thinner lines for large datasets
          },
        }));

        // Calculate smart label interval based on dataset size - very aggressive for large datasets
        const maxLabels = rowCount > 2000 ? 10 : rowCount > 1000 ? 15 : rowCount > 500 ? 20 : 30;
        const interval = Math.max(0, Math.ceil(xData.length / maxLabels) - 1);

        return {
          title: {
            text: spec.title || "Line Chart",
            left: "center",
            textStyle: { color: "#e0e0e0", fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "cross",
              lineStyle: { type: "dashed", width: 1 },
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
          legend: { data: spec.y, top: 30, textStyle: { color: "#e0e0e0" } },
          grid: { left: "10%", right: "10%", bottom: "15%", top: "15%" },
          xAxis: {
            type: "category",
            data: xData,
            name: spec.x_label || spec.x,
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: {
              rotate: 45,
              interval: interval,
              color: "#b0b0b0",
              formatter: (value: string) => {
                // For large datasets, truncate long labels
                if (rowCount > 1000 && value.length > 10) {
                  return value.substring(0, 10) + "...";
                }
                return value;
              },
            },
            axisTick: {
              interval: interval, // Match tick interval with labels
            },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y.join(", "),
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          dataZoom: [
            { 
              type: "inside", 
              start: 0, 
              end: rowCount > 1000 ? 10 : 100, // Show only 10% initially for large datasets
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
            },
            { 
              type: "slider", 
              start: 0, 
              end: rowCount > 1000 ? 10 : 100,
              height: 30,
              bottom: 10,
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
          animation: rowCount <= 1000, // Disable animation for large datasets
          large: rowCount > 1000, // Enable large data optimization
          largeThreshold: 1000,
        }));

        // Calculate smart label interval for bar graphs - very aggressive for large datasets
        const maxLabels = rowCount > 2000 ? 8 : rowCount > 1000 ? 12 : rowCount > 500 ? 18 : 30;
        const interval = Math.max(0, Math.ceil(xData.length / maxLabels) - 1);

        return {
          title: {
            text: spec.title || "Bar Graph",
            left: "center",
            textStyle: { color: "#e0e0e0", fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
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
          legend: { data: spec.y, top: 30, textStyle: { color: "#e0e0e0" } },
          grid: { left: "10%", right: "10%", bottom: "15%", top: "15%" },
          xAxis: {
            type: "category",
            data: xData,
            name: spec.x_label || spec.x,
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { 
              rotate: 45, 
              color: "#b0b0b0",
              interval: interval,
              formatter: (value: string) => {
                // For large datasets, truncate long labels
                if (rowCount > 500 && value.length > 12) {
                  return value.substring(0, 12) + "...";
                }
                return value;
              },
            },
            axisTick: {
              interval: interval,
            },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y.join(", "),
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          dataZoom: [
            { 
              type: "inside", 
              start: 0, 
              end: rowCount > 500 ? 20 : 100, // Show only 20% initially for large datasets
              zoomOnMouseWheel: true,
            },
            { 
              type: "slider", 
              start: 0, 
              end: rowCount > 500 ? 20 : 100,
              height: 30,
              bottom: 10,
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
          title: {
            text: spec.title || "Scatter Plot",
            left: "center",
            textStyle: { color: "#e0e0e0", fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            formatter: (params: any) => {
              const [x, y] = params.value;
              return `${spec.x}: ${x.toFixed(2)}<br/>${spec.y[0]}: ${y.toFixed(2)}`;
            },
          },
          grid: { left: "10%", right: "10%", bottom: "15%", top: "15%" },
          xAxis: {
            type: "value",
            name: spec.x_label || spec.x,
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          yAxis: {
            type: "value",
            name: spec.y_label || spec.y[0],
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          series: [
            {
              type: "scatter",
              data: scatterData,
              symbolSize: 6,
              large: rowCount > 2000,
              largeThreshold: 2000,
              progressive: 8000,
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
            
            // Validate coordinates
            if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
              return null;
            }
            
            return {
              value: [lon, lat, Math.max(0, value * 0.1)],
              itemStyle: {
                color: value > 0 ? "#ff6b6b" : "#4ecdc4",
                opacity: 0.8,
              },
            };
          })
          .filter((item: any) => item !== null);

        // NASA Blue Marble Earth texture
        const earthTextureUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyYTliZWQiLz48c3RvcCBvZmZzZXQ9IjcwJSIgc3RvcC1jb2xvcj0iIzFhN2FhZCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBkNGQ2ZCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=";

        return {
          backgroundColor: "#000000",
          title: {
            text: spec.title || "3D Globe",
            left: "center",
            textStyle: { color: "#e0e0e0", fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
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
                intensity: 0.5,
              },
              main: {
                intensity: 1.8,
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
              blendMode: "lighter",
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
          backgroundColor: "#1a1a2e",
          title: {
            text: spec.title || "3D Scatter Plot",
            left: "center",
            textStyle: { color: "#e0e0e0", fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
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
                intensity: 1.2,
                shadow: true,
              },
              ambient: {
                intensity: 0.4,
              },
            },
          },
          xAxis3D: {
            name: spec.x_label || spec.x,
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          yAxis3D: {
            name: spec.y_label || spec.y[0],
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          zAxis3D: {
            name: spec.z_label || spec.z,
            nameTextStyle: { color: "#b0b0b0" },
            axisLabel: { color: "#b0b0b0" },
          },
          series: [
            {
              type: "scatter3D",
              data: scatter3DData,
              symbolSize: 6,
              itemStyle: {
                color: "rgba(100, 180, 255, 0.8)",
              },
            },
          ],
        };
      }

      default:
        setError(`Unsupported plot type: ${spec.plot_type}`);
        return {};
    }
  }, [data, spec]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-900/50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
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
            <h4 className="text-red-400 font-semibold">Visualization Error</h4>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-400">No data available for visualization</p>
      </div>
    );
  }

  const is3D = spec.plot_type === "globe_3d" || spec.plot_type === "scatter_3d";
  const height = is3D ? 600 : 400;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-900/30">
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
