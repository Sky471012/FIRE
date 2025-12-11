export type PlotType = "line_chart" | "scatter_plot" | "bar_graph" | "globe_3d" | "scatter_3d";

export interface VisualizationSpec {
    sql: string;
    plot_type: PlotType;
    x: string;
    y: string[];
    z?: string;
    title?: string;
    x_label?: string;
    y_label?: string;
    z_label?: string;
    lon?: string;
    lat?: string;
    value?: string;
    color_by?: string;
    facet_by?: string;
}

export interface QueryResult {
    columns: string[];
    data: string[][];
}
