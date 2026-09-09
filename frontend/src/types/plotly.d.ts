declare module 'react-plotly.js' {
  import * as Plotly from 'plotly.js-dist-min'

  interface PlotParams {
    data: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    frames?: Plotly.Frame[]
    config?: Partial<Plotly.Config>
    style?: React.CSSProperties
    className?: string
    useResizeHandler?: boolean
    onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onAfterPlot?: () => void
    onError?: (error: Error) => void
    onHover?: (data: Plotly.PlotMouseEvent) => void
    onUnhover?: (data: Plotly.PlotMouseEvent) => void
    onSelected?: (data: Plotly.PlotSelectionEvent) => void
  }

  export default class Plot extends React.Component<PlotParams> {}
}

declare module 'plotly.js-dist-min' {
  const Plotly: any
  export default Plotly
}